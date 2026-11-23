const userService = require('../services/userService');

async function getById(req, res) {
  try {
    const result = await userService.getUserById(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('ERRO GET USER BY ID:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar usuário' });
  }
}

async function create(req, res) {
  try {
    const result = await userService.createUser(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('ERRO CREATE USER:', err);
    return res.status(500).json({ error: 'Erro interno ao cadastrar usuário' });
  }
}

async function update(req, res) {
  try {
    const result = await userService.updateUser(req.params.id, req.body);
    if (result.status === 204) {
      return res.status(204).send();
    }
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('ERRO UPDATE USER:', err);
    return res.status(500).json({ error: 'Erro interno ao atualizar usuário' });
  }
}

async function remove(req, res) {
  try {
    const result = await userService.deleteUser(req.params.id);
    if (result.status === 204) {
      return res.status(204).send();
    }
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('ERRO DELETE USER:', err);
    return res.status(500).json({ error: 'Erro interno ao remover usuário' });
  }
}

async function token(req, res) {
  try {
    const result = await userService.generateToken(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('ERRO GENERATE TOKEN:', err);
    return res.status(500).json({ error: 'Erro interno ao gerar token' });
  }
}

module.exports = {
  getById,
  create,
  update,
  remove,
  token
};