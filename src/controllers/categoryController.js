const categoryService = require('../services/categoryService');

async function search(req, res) {
  try {
    const result = await categoryService.searchCategories(req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao buscar categorias' });
  }
}

async function getById(req, res) {
  try {
    const result = await categoryService.getCategoryById(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao buscar categoria' });
  }
}

async function create(req, res) {
  try {
    const result = await categoryService.createCategory(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao cadastrar categoria' });
  }
}

async function update(req, res) {
  try {
    const result = await categoryService.updateCategory(req.params.id, req.body);
    if (result.status === 204) {
      return res.status(204).send();
    }
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao atualizar categoria' });
  }
}

async function remove(req, res) {
  try {
    const result = await categoryService.deleteCategory(req.params.id);
    if (result.status === 204) {
      return res.status(204).send();
    }
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao remover categoria' });
  }
}

module.exports = {
  search,
  getById,
  create,
  update,
  remove
};