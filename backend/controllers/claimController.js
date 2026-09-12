const { pool } = require('../config/db');
const { refreshExpiredPosts } = require('./foodController');

// POST /api/foods/:id/claim (Recipient only)
async function claimFood(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await refreshExpiredPosts();
    const foodId = parseInt(req.params.id, 10);

    if (isNaN(foodId)) {
      return res.status(400).json({ success: false, message: 'Invalid food ID.' });
    }

    await connection.beginTransaction();

    // 1. Lock and verify food post
    const [foodRows] = await connection.query(
      'SELECT * FROM food_posts WHERE id = ? FOR UPDATE',
      [foodId]
    );

    if (foodRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Food post not found.' });
    }

    const food = foodRows[0];

    // 2. Prevent provider claiming own food
    if (food.provider_id === req.user.id) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'You cannot claim food posted by yourself.' });
    }

    // 3. Verify status is AVAILABLE
    if (food.status !== 'AVAILABLE') {
      await connection.rollback();
      const statusMessages = {
        CLAIMED: 'This food has already been claimed by someone else.',
        COLLECTED: 'This food has already been collected.',
        EXPIRED: 'This surplus food posting has expired and is no longer available.'
      };
      return res.status(409).json({
        success: false,
        message: statusMessages[food.status] || `Food is not available (Status: ${food.status}).`
      });
    }

    // 4. Verify deadline not expired
    const deadline = new Date(food.available_until);
    if (deadline <= new Date()) {
      await connection.query("UPDATE food_posts SET status = 'EXPIRED' WHERE id = ?", [foodId]);
      await connection.commit();
      return res.status(400).json({
        success: false,
        message: 'The pickup deadline for this food has passed. Post is now marked as EXPIRED.'
      });
    }

    // 5. Update food post status to CLAIMED
    await connection.query(
      "UPDATE food_posts SET status = 'CLAIMED' WHERE id = ?",
      [foodId]
    );

    // 6. Insert new claim record
    const [claimResult] = await connection.query(
      "INSERT INTO claims (food_post_id, recipient_id, status, claimed_at) VALUES (?, ?, 'CLAIMED', NOW())",
      [foodId, req.user.id]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Food claimed successfully! Please collect before the deadline.',
      data: {
        claim_id: claimResult.insertId,
        food_post_id: food.id,
        food_name: food.food_name,
        quantity: food.quantity,
        unit: food.unit,
        pickup_location: food.pickup_location,
        pickup_deadline: food.available_until,
        status: 'CLAIMED'
      }
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

// GET /api/claims/my (Recipient's claimed food)
async function getMyClaims(req, res, next) {
  try {
    await refreshExpiredPosts();

    const [claims] = await pool.query(
      `SELECT c.id AS claim_id, c.status AS claim_status, c.claimed_at, c.collected_at,
              f.id AS food_post_id, f.food_name, f.category, f.quantity, f.unit,
              f.is_vegetarian, f.pickup_location, f.available_until, f.image_url,
              f.status AS food_status,
              u.full_name AS provider_name, u.email AS provider_email
       FROM claims c
       JOIN food_posts f ON c.food_post_id = f.id
       JOIN users u ON f.provider_id = u.id
       WHERE c.recipient_id = ?
       ORDER BY c.claimed_at DESC`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      count: claims.length,
      data: claims
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/foods/:id/claim (Check claim for specific food)
async function getFoodClaim(req, res, next) {
  try {
    const foodId = parseInt(req.params.id, 10);
    const [rows] = await pool.query(
      `SELECT c.*, u.full_name AS recipient_name, u.email AS recipient_email
       FROM claims c
       JOIN users u ON c.recipient_id = u.id
       WHERE c.food_post_id = ?
       ORDER BY c.claimed_at DESC LIMIT 1`,
      [foodId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No claim found for this food.' });
    }

    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/claims/:id/collect (Provider confirms handover)
async function collectClaim(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const claimId = parseInt(req.params.id, 10);
    if (isNaN(claimId)) {
      return res.status(400).json({ success: false, message: 'Invalid claim ID.' });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT c.*, f.provider_id, f.food_name, f.quantity, f.unit
       FROM claims c
       JOIN food_posts f ON c.food_post_id = f.id
       WHERE c.id = ? FOR UPDATE`,
      [claimId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Claim record not found.' });
    }

    const claim = rows[0];

    // Verify permission: Only the provider who posted the food or Admin can confirm collection
    if (req.user.role !== 'ADMIN' && claim.provider_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only the food provider can confirm handover and mark food as collected.'
      });
    }

    if (claim.status === 'COLLECTED') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'This food post has already been marked as collected.'
      });
    }

    // Update claim status
    await connection.query(
      "UPDATE claims SET status = 'COLLECTED', collected_at = NOW() WHERE id = ?",
      [claimId]
    );

    // Update food post status
    await connection.query(
      "UPDATE food_posts SET status = 'COLLECTED' WHERE id = ?",
      [claim.food_post_id]
    );

    // Record pickup record
    await connection.query(
      `INSERT INTO pickup_records (claim_id, provider_id, recipient_id, food_post_id, pickup_time)
       VALUES (?, ?, ?, ?, NOW())`,
      [claimId, claim.provider_id, claim.recipient_id, claim.food_post_id]
    );

    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Food handover confirmed! Food marked as COLLECTED.',
      data: {
        claim_id: claimId,
        food_post_id: claim.food_post_id,
        food_status: 'COLLECTED',
        claim_status: 'COLLECTED'
      }
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

module.exports = {
  claimFood,
  getMyClaims,
  getFoodClaim,
  collectClaim
};
