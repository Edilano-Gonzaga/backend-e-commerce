const { Category } = require('../models');

const ALLOWED_FIELDS = ['id', 'name', 'slug', 'use_in_menu'];

function parseFields(fieldsParam) {
  if (!fieldsParam) {
    return { attributes: ALLOWED_FIELDS };
  }

  const requested = String(fieldsParam)
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  if (requested.length === 0) {
    return { error: 'Parâmetro fields inválido' };
  }

  const invalid = requested.filter((f) => !ALLOWED_FIELDS.includes(f));
  if (invalid.length > 0) {
    return { error: `Campos inválidos em fields: ${invalid.join(', ')}` };
  }

  // Garante id quando não pedido explicitamente só se fizer sentido, ou mantém exatamente o pedido
  return { attributes: requested };
}

function parseUseInMenu(value) {
  if (value === undefined) return { filter: undefined };
  if (value === 'true' || value === true || value === '1' || value === 1) {
    return { filter: true };
  }
  if (value === 'false' || value === false || value === '0' || value === 0) {
    return { filter: false };
  }
  return { error: 'Parâmetro use_in_menu inválido' };
}

async function searchCategories(query = {}) {
  const rawLimit = query.limit !== undefined ? Number(query.limit) : 12;
  const rawPage = query.page !== undefined ? Number(query.page) : 1;

  if (!Number.isInteger(rawLimit) || (rawLimit <= 0 && rawLimit !== -1)) {
    return { status: 400, body: { error: 'Parâmetro limit inválido' } };
  }

  if (!Number.isInteger(rawPage) || rawPage <= 0) {
    return { status: 400, body: { error: 'Parâmetro page inválido' } };
  }

  const fieldsResult = parseFields(query.fields);
  if (fieldsResult.error) {
    return { status: 400, body: { error: fieldsResult.error } };
  }

  const menuResult = parseUseInMenu(query.use_in_menu);
  if (menuResult.error) {
    return { status: 400, body: { error: menuResult.error } };
  }

  const where = {};
  if (menuResult.filter !== undefined) {
    where.use_in_menu = menuResult.filter;
  }

  const findOptions = {
    where,
    attributes: fieldsResult.attributes,
    order: [['id', 'ASC']]
  };

  if (rawLimit !== -1) {
    findOptions.limit = rawLimit;
    findOptions.offset = (rawPage - 1) * rawLimit;
  }

  const { count, rows } = await Category.findAndCountAll(findOptions);

  const data = rows.map((row) => {
    const plain = row.get({ plain: true });
    if (plain.use_in_menu !== undefined) {
      plain.use_in_menu = Boolean(plain.use_in_menu);
    }
    return plain;
  });

  return {
    status: 200,
    body: {
      data,
      total: count,
      limit: rawLimit,
      page: rawLimit === -1 ? 1 : rawPage
    }
  };
}

async function getCategoryById(id) {
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { status: 400, body: { error: 'ID de categoria inválido' } };
  }

  const category = await Category.findByPk(categoryId, {
    attributes: ['id', 'name', 'slug', 'use_in_menu']
  });

  if (!category) {
    return { status: 404, body: { error: 'Categoria não encontrada' } };
  }

  const plain = category.get({ plain: true });
  plain.use_in_menu = Boolean(plain.use_in_menu);

  return { status: 200, body: plain };
}

async function createCategory({ name, slug, use_in_menu }) {
  if (!name || !slug) {
    return { status: 400, body: { error: 'name e slug são obrigatórios' } };
  }

  let menuFlag = false;
  if (use_in_menu !== undefined) {
    const parsed = parseUseInMenu(use_in_menu);
    if (parsed.error) {
      return { status: 400, body: { error: parsed.error } };
    }
    menuFlag = parsed.filter;
  }

  const created = await Category.create({
    name: String(name).trim(),
    slug: String(slug).trim(),
    use_in_menu: menuFlag
  });

  return {
    status: 201,
    body: {
      id: created.id,
      name: created.name,
      slug: created.slug,
      use_in_menu: Boolean(created.use_in_menu)
    }
  };
}

async function updateCategory(id, { name, slug, use_in_menu }) {
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { status: 400, body: { error: 'ID de categoria inválido' } };
  }

  if (!name || !slug) {
    return { status: 400, body: { error: 'name e slug são obrigatórios' } };
  }

  const category = await Category.findByPk(categoryId);
  if (!category) {
    return { status: 404, body: { error: 'Categoria não encontrada' } };
  }

  const updates = {
    name: String(name).trim(),
    slug: String(slug).trim()
  };

  if (use_in_menu !== undefined) {
    const parsed = parseUseInMenu(use_in_menu);
    if (parsed.error) {
      return { status: 400, body: { error: parsed.error } };
    }
    updates.use_in_menu = parsed.filter;
  }

  await category.update(updates);
  return { status: 204 };
}

async function deleteCategory(id) {
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { status: 400, body: { error: 'ID de categoria inválido' } };
  }

  const category = await Category.findByPk(categoryId);
  if (!category) {
    return { status: 404, body: { error: 'Categoria não encontrada' } };
  }

  await category.destroy();
  return { status: 204 };
}

module.exports = {
  searchCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};