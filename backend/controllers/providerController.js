const { pool } = require('../config/db');
const { refreshExpiredPosts } = require('./foodController');

// GET /api/provider/foods
async function getProviderFoods(req, res, next) {
  try {
    await refreshExpiredPosts();

    const [foods] = await pool.query(
      `SELECT f.*,
              c.id AS claim_id, c.status AS claim_status, c.claimed_at, c.collected_at,
              u.full_name AS claimant_name, u.email AS claimant_email
       FROM food_posts f
       LEFT JOIN claims c ON f.id = c.food_post_id
       LEFT JOIN users u ON c.recipient_id = u.id
       WHERE f.provider_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/provider/stats
async function getProviderStats(req, res, next) {
  try {
    await refreshExpiredPosts();

    const [statsRows] = await pool.query(
      `SELECT
        COUNT(*) AS total_posts,
        SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) AS active_posts,
        SUM(CASE WHEN status = 'CLAIMED' THEN 1 ELSE 0 END) AS claimed_posts,
        SUM(CASE WHEN status = 'COLLECTED' THEN 1 ELSE 0 END) AS collected_posts,
        SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) AS expired_posts,
        COALESCE(SUM(CASE WHEN status = 'COLLECTED' THEN quantity ELSE 0 END), 0) AS total_rescued_portions
       FROM food_posts
       WHERE provider_id = ?`,
      [req.user.id]
    );

    const stats = statsRows[0];

    res.status(200).json({
      success: true,
      data: {
        total_posts: Number(stats.total_posts) || 0,
        active_posts: Number(stats.active_posts) || 0,
        claimed_posts: Number(stats.claimed_posts) || 0,
        collected_posts: Number(stats.collected_posts) || 0,
        expired_posts: Number(stats.expired_posts) || 0,
        total_rescued_portions: Number(stats.total_rescued_portions) || 0
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProviderFoods,
  getProviderStats
};
