const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const {
  sequelize,
  Product,
  ProductImage,
  ProductOption,
  ProductCategory,
  Category
} = require('../models');

const ALLOWED_FIELDS = [
  'id',
  'enabled',
  'name',
  'slug',
  'use_in_menu',
  'stock',
  'description',
  'price',
  'price_with_discount',
  'category_ids',
  'images',
  'options'
];

function parseRadius(radius) {
  if (radius === undefined || radius === null || radius === '') return 0;
  if (typeof radius === 'number') return Number.isFinite(radius) ? Math.trunc(radius) : NaN;
  const cleaned = String(radius).replace(/px$/i, '').trim();
  const parsed = Number(cleaned);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function normalizeOptionValues(option) {
  const raw = option.values !== undefined ? option.values : option.value;
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function saveImageContent(content, index) {
  if (!content || typeof content !== 'string') return null;

  // Se já for URL ou caminho relativo simples, reaproveita direto
  if (
    content.startsWith('http://') ||
    content.startsWith('https://') ||
    content.startsWith('/')
  ) {
    return content;
  }

  const base64Match = content.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  const extFromMime = base64Match ? base64Match[1].replace('jpeg', 'jpg') : 'png';
  const base64Data = base64Match ? base64Match[2] : content;

  const uploadDir = path.resolve(process.cwd(), 'uploads', 'products');
  fs.mkdirSync(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}.${extFromMime}`;
  const fullPath = path.join(uploadDir, fileName);
  fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'));

  return `/uploads/products/${fileName}`;
}

function formatProduct(productPlain) {
  const categoryIds = Array.isArray(productPlain.categories)
    ? productPlain.categories.map((c) => c.id)
    : [];

  const images = Array.isArray(productPlain.images)
    ? productPlain.images.map((img) => ({
        id: img.id,
        content: img.path
      }))
    : [];

  const options = Array.isArray(productPlain.options)
    ? productPlain.options.map((opt) => ({
        id: opt.id,
        title: opt.title,
        shape: opt.shape,
        radius: opt.radius,
        type: opt.type,
        values: opt.values
          ? String(opt.values)
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean)
          : []
      }))
    : [];

  const formatted = {
    id: productPlain.id,
    enabled: Boolean(productPlain.enabled),
    name: productPlain.name,
    slug: productPlain.slug,
    stock: Number(productPlain.stock ?? 0),
    description: productPlain.description ?? '',
    price: Number(productPlain.price),
    price_with_discount: Number(productPlain.price_with_discount),
    category_ids: categoryIds,
    images,
    options
  };

  if (productPlain.use_in_menu !== undefined) {
    formatted.use_in_menu = Boolean(productPlain.use_in_menu);
  }

  return formatted;
}

function parseOptionFilters(query) {
  const filters = [];
  for (const [key, val] of Object.entries(query)) {
    const match = key.match(/^option\[(\d+)\]$/);
    if (match) {
      const optionId = Number(match[1]);
      const values = String(val)
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      if (values.length > 0) {
        filters.push({ optionId, values });
      }
    }
  }
  return filters;
}

async function searchProducts(query = {}) {
  const rawLimit = query.limit !== undefined ? Number(query.limit) : 12;
  const rawPage = query.page !== undefined ? Number(query.page) : 1;

  if (!Number.isInteger(rawLimit) || (rawLimit <= 0 && rawLimit !== -1)) {
    return { status: 400, body: { error: 'Parâmetro limit inválido' } };
  }

  if (!Number.isInteger(rawPage) || rawPage <= 0) {
    return { status: 400, body: { error: 'Parâmetro page inválido' } };
  }

  let selectedFields = null;
  if (query.fields) {
    const requested = String(query.fields)
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const invalid = requested.filter((f) => !ALLOWED_FIELDS.includes(f));
    if (requested.length === 0 || invalid.length > 0) {
      return { status: 400, body: { error: 'Parâmetro fields inválido' } };
    }
    selectedFields = requested;
  }

  const where = {};

  if (query.match) {
    const term = `%${String(query.match).trim()}%`;
    where[Op.or] = [
      { name: { [Op.like]: term } },
      { description: { [Op.like]: term } }
    ];
  }

  if (query['price-range']) {
    const parts = String(query['price-range']).split('-');
    if (parts.length !== 2) {
      return { status: 400, body: { error: 'Parâmetro price-range inválido' } };
    }
    const min = Number(parts[0]);
    const max = Number(parts[1]);
    if (Number.isNaN(min) || Number.isNaN(max) || min > max) {
      return { status: 400, body: { error: 'Faixa de preço inválida' } };
    }
    where.price = { [Op.between]: [min, max] };
  }

  let categoryIdsFilter = null;
  if (query.category_ids) {
    categoryIdsFilter = String(query.category_ids)
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (categoryIdsFilter.length === 0) {
      return { status: 400, body: { error: 'Parâmetro category_ids inválido' } };
    }
  }

  const optionFilters = parseOptionFilters(query);

  const include = [
    {
      model: Category,
      as: 'categories',
      attributes: ['id'],
      through: { attributes: [] },
      ...(categoryIdsFilter ? { where: { id: { [Op.in]: categoryIdsFilter } }, required: true } : {})
    },
    {
      model: ProductImage,
      as: 'images',
      attributes: ['id', 'path', 'enabled']
    },
    {
      model: ProductOption,
      as: 'options',
      attributes: ['id', 'title', 'shape', 'radius', 'type', 'values']
    }
  ];

  const allMatching = await Product.findAll({
    where,
    include,
    order: [['id', 'ASC']],
    distinct: true
  });

  // Busca todas as categorias do produto para manter category_ids completo mesmo quando filtra por categoria
  const productIds = allMatching.map((p) => p.id);
  const links = productIds.length
    ? await ProductCategory.findAll({ where: { product_id: { [Op.in]: productIds } } })
    : [];

  const categoriesByProduct = new Map();
  for (const link of links) {
    if (!categoriesByProduct.has(link.product_id)) {
      categoriesByProduct.set(link.product_id, []);
    }
    categoriesByProduct.get(link.product_id).push(link.category_id);
  }

  let formattedList = allMatching.map((prod) => {
    const plain = prod.get({ plain: true });
    plain.categories = (categoriesByProduct.get(plain.id) || []).map((id) => ({ id }));
    return formatProduct(plain);
  });

  if (optionFilters.length > 0) {
    formattedList = formattedList.filter((item) =>
      optionFilters.every((filter) =>
        item.options.some((opt) => {
          if (opt.id !== filter.optionId) return false;
          return filter.values.some((v) => opt.values.includes(v));
        })
      )
    );
  }

  if (selectedFields) {
    formattedList = formattedList.map((item) => {
      const picked = {};
      for (const field of selectedFields) {
        picked[field] = item[field];
      }
      return picked;
    });
  }

  const total = formattedList.length;
  const pagedData =
    rawLimit === -1
      ? formattedList
      : formattedList.slice((rawPage - 1) * rawLimit, rawPage * rawLimit);

  return {
    status: 200,
    body: {
      data: pagedData,
      total,
      limit: rawLimit,
      page: rawLimit === -1 ? 1 : rawPage
    }
  };
}

async function getProductById(id) {
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return { status: 400, body: { error: 'ID de produto inválido' } };
  }

  const product = await Product.findByPk(productId, {
    include: [
      {
        model: Category,
        as: 'categories',
        attributes: ['id'],
        through: { attributes: [] }
      },
      {
        model: ProductImage,
        as: 'images',
        attributes: ['id', 'path', 'enabled']
      },
      {
        model: ProductOption,
        as: 'options',
        attributes: ['id', 'title', 'shape', 'radius', 'type', 'values']
      }
    ]
  });

  if (!product) {
    return { status: 404, body: { error: 'Produto não encontrado' } };
  }

  return { status: 200, body: formatProduct(product.get({ plain: true })) };
}

async function createProduct(payload = {}) {
  const {
    enabled = false,
    name,
    slug,
    use_in_menu = false,
    stock = 0,
    description = '',
    price,
    price_with_discount,
    category_ids = [],
    images = [],
    options = []
  } = payload;

  if (
    !name ||
    !slug ||
    price === undefined ||
    price === null ||
    price_with_discount === undefined ||
    price_with_discount === null
  ) {
    return {
      status: 400,
      body: { error: 'name, slug, price e price_with_discount são obrigatórios' }
    };
  }

  const numericPrice = Number(price);
  const numericDiscountPrice = Number(price_with_discount);
  const numericStock = Number(stock ?? 0);

  if (Number.isNaN(numericPrice) || Number.isNaN(numericDiscountPrice) || Number.isNaN(numericStock)) {
    return { status: 400, body: { error: 'Valores numéricos inválidos no produto' } };
  }

  const transaction = await sequelize.transaction();

  try {
    const product = await Product.create(
      {
        enabled: Boolean(enabled),
        name: String(name).trim(),
        slug: String(slug).trim(),
        use_in_menu: Boolean(use_in_menu),
        stock: Math.trunc(numericStock),
        description: description !== undefined ? String(description) : '',
        price: numericPrice,
        price_with_discount: numericDiscountPrice
      },
      { transaction }
    );

    if (Array.isArray(category_ids) && category_ids.length > 0) {
      const validIds = category_ids.map(Number).filter((id) => Number.isInteger(id) && id > 0);
      if (validIds.length > 0) {
        await product.setCategories(validIds, { transaction });
      }
    }

    if (Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < images.length; i += 1) {
        const img = images[i];
        const savedPath = saveImageContent(img.content, i);
        if (savedPath) {
          await ProductImage.create(
            {
              product_id: product.id,
              enabled: img.enabled !== undefined ? Boolean(img.enabled) : true,
              path: savedPath
            },
            { transaction }
          );
        }
      }
    }

    if (Array.isArray(options) && options.length > 0) {
      for (const opt of options) {
        const radius = parseRadius(opt.radius);
        if (Number.isNaN(radius)) {
          await transaction.rollback();
          return { status: 400, body: { error: 'Valor de radius inválido na opção' } };
        }

        const valuesArr = normalizeOptionValues(opt);
        if (!opt.title || valuesArr.length === 0) {
          await transaction.rollback();
          return { status: 400, body: { error: 'Opção precisa de title e valores' } };
        }

        await ProductOption.create(
          {
            product_id: product.id,
            title: String(opt.title).trim(),
            shape: opt.shape === 'circle' ? 'circle' : 'square',
            radius,
            type: opt.type === 'color' ? 'color' : 'text',
            values: valuesArr.join(',')
          },
          { transaction }
        );
      }
    }

    await transaction.commit();

    const created = await getProductById(product.id);
    return { status: 201, body: created.body };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function updateProduct(id, payload = {}) {
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return { status: 400, body: { error: 'ID de produto inválido' } };
  }

  const product = await Product.findByPk(productId);
  if (!product) {
    return { status: 404, body: { error: 'Produto não encontrado' } };
  }

  const transaction = await sequelize.transaction();

  try {
    const productUpdates = {};
    if (payload.enabled !== undefined) productUpdates.enabled = Boolean(payload.enabled);
    if (payload.name !== undefined) productUpdates.name = String(payload.name).trim();
    if (payload.slug !== undefined) productUpdates.slug = String(payload.slug).trim();
    if (payload.use_in_menu !== undefined) productUpdates.use_in_menu = Boolean(payload.use_in_menu);
    if (payload.stock !== undefined) productUpdates.stock = Math.trunc(Number(payload.stock));
    if (payload.description !== undefined) productUpdates.description = String(payload.description);
    if (payload.price !== undefined) productUpdates.price = Number(payload.price);
    if (payload.price_with_discount !== undefined) {
      productUpdates.price_with_discount = Number(payload.price_with_discount);
    }

    await product.update(productUpdates, { transaction });

    if (Array.isArray(payload.category_ids)) {
      const validIds = payload.category_ids.map(Number).filter((cid) => Number.isInteger(cid) && cid > 0);
      await product.setCategories(validIds, { transaction });
    }

    if (Array.isArray(payload.images)) {
      for (let i = 0; i < payload.images.length; i += 1) {
        const img = payload.images[i];

        if (img.deleted && img.id) {
          await ProductImage.destroy({
            where: { id: Number(img.id), product_id: product.id },
            transaction
          });
        } else if (img.id) {
          const existingImg = await ProductImage.findOne({
            where: { id: Number(img.id), product_id: product.id },
            transaction
          });
          if (existingImg && img.content) {
            const newPath = saveImageContent(img.content, i);
            await existingImg.update({ path: newPath }, { transaction });
          }
        } else if (img.content) {
          const savedPath = saveImageContent(img.content, i);
          if (savedPath) {
            await ProductImage.create(
              {
                product_id: product.id,
                enabled: img.enabled !== undefined ? Boolean(img.enabled) : true,
                path: savedPath
              },
              { transaction }
            );
          }
        }
      }
    }

    if (Array.isArray(payload.options)) {
      for (const opt of payload.options) {
        if (opt.deleted && opt.id) {
          await ProductOption.destroy({
            where: { id: Number(opt.id), product_id: product.id },
            transaction
          });
        } else if (opt.id) {
          const existingOpt = await ProductOption.findOne({
            where: { id: Number(opt.id), product_id: product.id },
            transaction
          });
          if (existingOpt) {
            const optUpdates = {};
            if (opt.title !== undefined) optUpdates.title = String(opt.title).trim();
            if (opt.shape !== undefined) optUpdates.shape = opt.shape === 'circle' ? 'circle' : 'square';
            if (opt.radius !== undefined) {
              const r = parseRadius(opt.radius);
              if (Number.isNaN(r)) {
                await transaction.rollback();
                return { status: 400, body: { error: 'Valor de radius inválido' } };
              }
              optUpdates.radius = r;
            }
            if (opt.type !== undefined) optUpdates.type = opt.type === 'color' ? 'color' : 'text';

            const valuesArr = normalizeOptionValues(opt);
            if (valuesArr.length > 0) {
              optUpdates.values = valuesArr.join(',');
            }

            await existingOpt.update(optUpdates, { transaction });
          }
        } else {
          const radius = parseRadius(opt.radius);
          const valuesArr = normalizeOptionValues(opt);
          if (Number.isNaN(radius) || !opt.title || valuesArr.length === 0) {
            await transaction.rollback();
            return { status: 400, body: { error: 'Dados da nova opção inválidos' } };
          }

          await ProductOption.create(
            {
              product_id: product.id,
              title: String(opt.title).trim(),
              shape: opt.shape === 'circle' ? 'circle' : 'square',
              radius,
              type: opt.type === 'color' ? 'color' : 'text',
              values: valuesArr.join(',')
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();
    return { status: 204 };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function deleteProduct(id) {
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return { status: 400, body: { error: 'ID de produto inválido' } };
  }

  const product = await Product.findByPk(productId);
  if (!product) {
    return { status: 404, body: { error: 'Produto não encontrado' } };
  }

  const transaction = await sequelize.transaction();
  try {
    await ProductImage.destroy({ where: { product_id: product.id }, transaction });
    await ProductOption.destroy({ where: { product_id: product.id }, transaction });
    await ProductCategory.destroy({ where: { product_id: product.id }, transaction });
    await product.destroy({ transaction });

    await transaction.commit();
    return { status: 204 };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = {
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};