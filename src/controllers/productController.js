const productService = require('../services/productService');

async function search(req, res) {
  try {
    const result = await productService.searchProducts(req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao buscar produtos' });
  }
}

async function getById(req, res) {
  try {
    const result = await productService.getProductById(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao buscar produto' });
  }
}

async function create(req, res) {
  try {
    const result = await productService.createProduct(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao cadastrar produto' });
  }
}

async function update(req, res) {
  try {
    const result = await productService.updateProduct(req.params.id, req.body);
    if (result.status === 204) {
      return res.status(204).send();
    }
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao atualizar produto' });
  }
}

async function remove(req, res) {
  try {
    const result = await productService.deleteProduct(req.params.id);
    if (result.status === 204) {
      return res.status(204).send();
    }
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao remover produto' });
  }
}

module.exports = {
  search,
  getById,
  create,
  update,
  remove
};