const { pool } = require('../config/db');
const { refreshExpiredPosts } = require('./foodController');

// GET /api/admin/stats
async function getAdminStats(req, res, next) {
  try {
    await refreshExpiredPosts();

    const [userStats] = await pool.query(`
      SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN role = 'PROVIDER' THEN 1 ELSE 0 END) AS total_providers,
        SUM(CASE WHEN role = 'RECIPIENT' THEN 1 ELSE 0 END) AS total_recipients
      FROM users
    `);

    const [foodStats] = await pool.query(`
      SELECT
        COUNT(*) AS total_food_posts,
        SUM(CASE WHEN status = 'COLLECTED' THEN 1 ELSE 0 END) AS collected_posts,
        COALESCE(SUM(CASE WHEN status = 'COLLECTED' THEN quantity ELSE 0 END), 0) AS total_rescued_portions
      FROM food_posts
    `);

    const [claimStats] = await pool.query(`
      SELECT COUNT(*) AS total_claims FROM claims
    `);

    res.status(200).json({
      success: true,
      data: {
        total_users: Number(userStats[0].total_users) || 0,
        total_providers: Number(userStats[0].total_providers) || 0,
        total_recipients: Number(userStats[0].total_recipients) || 0,
        total_food_posts: Number(foodStats[0].total_food_posts) || 0,
        total_claims: Number(claimStats[0].total_claims) || 0,
        collected_posts: Number(foodStats[0].collected_posts) || 0,
        total_rescued_portions: Number(foodStats[0].total_rescued_portions) || 0
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users
async function getAdminUsers(req, res, next) {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.full_name, u.email, u.role, u.created_at,
             (SELECT COUNT(*) FROM food_posts f WHERE f.provider_id = u.id) AS posts_count,
             (SELECT COUNT(*) FROM claims c WHERE c.recipient_id = u.id) AS claims_count
      FROM users u
      ORDER BY u.created_at DESC
    `);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/foods
async function getAdminFoods(req, res, next) {
  try {
    await refreshExpiredPosts();

    const [foods] = await pool.query(`
      SELECT f.*, u.full_name AS provider_name, u.email AS provider_email,
             c.id AS claim_id, c.status AS claim_status, cu.full_name AS claimant_name
      FROM food_posts f
      JOIN users u ON f.provider_id = u.id
      LEFT JOIN claims c ON f.id = c.food_post_id
      LEFT JOIN users cu ON c.recipient_id = cu.id
      ORDER BY f.created_at DESC
    `);

    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/claims
async function getAdminClaims(req, res, next) {
  try {
    await refreshExpiredPosts();

    const [claims] = await pool.query(`
      SELECT c.*, f.food_name, f.quantity, f.unit, f.pickup_location,
             pu.full_name AS provider_name,
             ru.full_name AS recipient_name, ru.email AS recipient_email
      FROM claims c
      JOIN food_posts f ON c.food_post_id = f.id
      JOIN users pu ON f.provider_id = pu.id
      JOIN users ru ON c.recipient_id = ru.id
      ORDER BY c.claimed_at DESC
    `);

    res.status(200).json({
      success: true,
      count: claims.length,
      data: claims
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/foods/:id
async function deleteFoodAdmin(req, res, next) {
  try {
    const foodId = parseInt(req.params.id, 10);
    const [result] = await pool.query('DELETE FROM food_posts WHERE id = ?', [foodId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Food post not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Food post removed by administrator.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAdminStats,
  getAdminUsers,
  getAdminFoods,
  getAdminClaims,
  deleteFoodAdmin
};
