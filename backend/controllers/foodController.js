const { pool } = require('../config/db');

// Helper to auto-expire past-deadline posts on-the-fly without background crons
async function refreshExpiredPosts() {
  try {
    await pool.query(
      "UPDATE food_posts SET status = 'EXPIRED' WHERE status = 'AVAILABLE' AND available_until < NOW()"
    );
    await pool.query(
      "UPDATE claims c JOIN food_posts f ON c.food_post_id = f.id SET c.status = 'EXPIRED' WHERE c.status = 'CLAIMED' AND f.status = 'EXPIRED'"
    );
  } catch (e) {
    console.error('Error auto-expiring posts:', e.message);
  }
}

// GET /api/foods (Browse with search & filters)
async function getAllFoods(req, res, next) {
  try {
    await refreshExpiredPosts();

    const { search, category, is_vegetarian, status } = req.query;

    let query = `
      SELECT f.id, f.provider_id, f.food_name, f.category, f.description,
             f.quantity, f.unit, f.is_vegetarian, f.preparation_time,
             f.pickup_location, f.available_until, f.image_url, f.status,
             f.created_at, f.updated_at,
             u.full_name AS provider_name, u.email AS provider_email
      FROM food_posts f
      JOIN users u ON f.provider_id = u.id
      WHERE 1=1
    `;

    const params = [];

    // Filter by status (Default to AVAILABLE unless specified)
    if (status && status.toUpperCase() !== 'ALL') {
      query += ' AND f.status = ?';
      params.push(status.toUpperCase());
    } else if (!status) {
      // By default show available posts for discovery
      query += " AND f.status = 'AVAILABLE'";
    }

    // Filter by category
    if (category && category.trim() && category.toUpperCase() !== 'ALL') {
      query += ' AND f.category = ?';
      params.push(category.trim());
    }

    // Filter by vegetarian
    if (is_vegetarian !== undefined && is_vegetarian !== '') {
      const isVeg = is_vegetarian === 'true' || is_vegetarian === '1' || is_vegetarian === true;
      query += ' AND f.is_vegetarian = ?';
      params.push(isVeg ? 1 : 0);
    }

    // Search by food name, category, or location
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ' AND (f.food_name LIKE ? OR f.category LIKE ? OR f.pickup_location LIKE ?)';
      params.push(term, term, term);
    }

    query += ' ORDER BY f.available_until ASC, f.created_at DESC';

    const [foods] = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/foods/:id (Detailed view)
async function getFoodById(req, res, next) {
  try {
    await refreshExpiredPosts();
    const foodId = parseInt(req.params.id, 10);

    if (isNaN(foodId)) {
      return res.status(400).json({ success: false, message: 'Invalid food post ID.' });
    }

    const [rows] = await pool.query(
      `SELECT f.*, u.full_name AS provider_name, u.email AS provider_email,
              c.id AS claim_id, c.recipient_id, c.status AS claim_status,
              c.claimed_at, cu.full_name AS recipient_name
       FROM food_posts f
       JOIN users u ON f.provider_id = u.id
       LEFT JOIN claims c ON f.id = c.food_post_id AND c.status IN ('CLAIMED', 'COLLECTED')
       LEFT JOIN users cu ON c.recipient_id = cu.id
       WHERE f.id = ?`,
      [foodId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Surplus food post not found.' });
    }

    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/foods (Provider post surplus food)
async function createFood(req, res, next) {
  try {
    const {
      food_name,
      category,
      description,
      quantity,
      unit,
      is_vegetarian,
      preparation_time,
      pickup_location,
      available_until,
      image_url
    } = req.body;

    // Validation
    if (!food_name || !food_name.trim()) {
      return res.status(400).json({ success: false, message: 'Food name is required.' });
    }
    const validCategories = ['Meals', 'Snacks', 'Bakery', 'Fruits', 'Vegetables', 'Beverages', 'Other'];
    if (!category || !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Valid category required: ${validCategories.join(', ')}`
      });
    }
    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive number.' });
    }
    if (!pickup_location || !pickup_location.trim()) {
      return res.status(400).json({ success: false, message: 'Pickup location is required.' });
    }
    if (!available_until) {
      return res.status(400).json({ success: false, message: 'Availability deadline (available_until) is required.' });
    }

    const deadlineDate = new Date(available_until);
    if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Availability deadline must be a valid future date and time.'
      });
    }

    const isVeg = is_vegetarian === undefined ? true : Boolean(is_vegetarian);

    const [result] = await pool.query(
      `INSERT INTO food_posts (
        provider_id, food_name, category, description, quantity, unit,
        is_vegetarian, preparation_time, pickup_location, available_until,
        image_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
      [
        req.user.id,
        food_name.trim(),
        category,
        description ? description.trim() : '',
        numQty,
        unit && unit.trim() ? unit.trim() : 'portions',
        isVeg ? 1 : 0,
        preparation_time ? new Date(preparation_time) : null,
        pickup_location.trim(),
        deadlineDate,
        image_url && image_url.trim() ? image_url.trim() : null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Your surplus food has been posted successfully.',
      data: {
        id: result.insertId,
        food_name: food_name.trim(),
        status: 'AVAILABLE'
      }
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/foods/:id (Provider update own post)
async function updateFood(req, res, next) {
  try {
    const foodId = parseInt(req.params.id, 10);
    if (isNaN(foodId)) {
      return res.status(400).json({ success: false, message: 'Invalid food ID.' });
    }

    // Check post exists and ownership
    const [existing] = await pool.query('SELECT * FROM food_posts WHERE id = ?', [foodId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Food post not found.' });
    }

    const post = existing[0];
    if (req.user.role !== 'ADMIN' && post.provider_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this food post.' });
    }

    // Cannot edit already claimed or collected food
    if (post.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit post with status ${post.status}. Only AVAILABLE posts can be modified.`
      });
    }

    const {
      food_name,
      category,
      description,
      quantity,
      unit,
      is_vegetarian,
      pickup_location,
      available_until,
      image_url
    } = req.body;

    const numQty = quantity !== undefined ? parseInt(quantity, 10) : post.quantity;
    const isVeg = is_vegetarian !== undefined ? Boolean(is_vegetarian) : post.is_vegetarian;

    await pool.query(
      `UPDATE food_posts SET
        food_name = ?,
        category = ?,
        description = ?,
        quantity = ?,
        unit = ?,
        is_vegetarian = ?,
        pickup_location = ?,
        available_until = ?,
        image_url = ?
      WHERE id = ?`,
      [
        food_name ? food_name.trim() : post.food_name,
        category || post.category,
        description !== undefined ? description.trim() : post.description,
        numQty,
        unit ? unit.trim() : post.unit,
        isVeg ? 1 : 0,
        pickup_location ? pickup_location.trim() : post.pickup_location,
        available_until ? new Date(available_until) : post.available_until,
        image_url !== undefined ? image_url : post.image_url,
        foodId
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Food post updated successfully.'
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/foods/:id (Owner Provider or Admin)
async function deleteFood(req, res, next) {
  try {
    const foodId = parseInt(req.params.id, 10);
    if (isNaN(foodId)) {
      return res.status(400).json({ success: false, message: 'Invalid food ID.' });
    }

    const [existing] = await pool.query('SELECT * FROM food_posts WHERE id = ?', [foodId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Food post not found.' });
    }

    const post = existing[0];
    if (req.user.role !== 'ADMIN' && post.provider_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this food post.' });
    }

    await pool.query('DELETE FROM food_posts WHERE id = ?', [foodId]);

    res.status(200).json({
      success: true,
      message: 'Food post removed successfully.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  refreshExpiredPosts,
  getAllFoods,
  getFoodById,
  createFood,
  updateFood,
  deleteFood
};
