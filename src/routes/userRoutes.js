const { Router } = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

const router = Router();

router.post('/v1/user/token', userController.token);
router.post('/v1/user', userController.create);
router.get('/v1/user/:id', userController.getById);
router.put('/v1/user/:id', authMiddleware, userController.update);
router.delete('/v1/user/:id', authMiddleware, userController.remove);

module.exports = router;