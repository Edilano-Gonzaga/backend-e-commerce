const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('API E-commerce', () => {
  let token = '';
  let userId = null;
  let categoryId = null;
  let productId = null;

  test('deve cadastrar usuário e gerar token JWT', async () => {
    const createRes = await request(app).post('/v1/user').send({
      firstname: 'Lucas',
      surname: 'Silva',
      email: 'lucas@teste.com',
      password: '123@123',
      confirmPassword: '123@123'
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toHaveProperty('id');
    expect(createRes.body.email).toBe('lucas@teste.com');
    userId = createRes.body.id;

    const getRes = await request(app).get(`/v1/user/${userId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.firstname).toBe('Lucas');

    const tokenRes = await request(app).post('/v1/user/token').send({
      email: 'lucas@teste.com',
      password: '123@123'
    });

    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body).toHaveProperty('token');
    token = tokenRes.body.token;
  });

  test('deve bloquear POST de categoria sem token com status 400', async () => {
    const res = await request(app).post('/v1/category').send({
      name: 'Calçados',
      slug: 'calcados',
      use_in_menu: true
    });

    expect(res.status).toBe(400);
  });

  test('deve criar, buscar, atualizar e remover categoria com token', async () => {
    const createRes = await request(app)
      .post('/v1/category')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Calçados',
        slug: 'calcados',
        use_in_menu: true
      });

    expect(createRes.status).toBe(201);
    categoryId = createRes.body.id;

    const searchRes = await request(app).get('/v1/category/search?limit=12&page=1');
    expect(searchRes.status).toBe(200);
    expect(Array.isArray(searchRes.body.data)).toBe(true);
    expect(searchRes.body.total).toBeGreaterThanOrEqual(1);

    const updateRes = await request(app)
      .put(`/v1/category/${categoryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Calçados Esportivos',
        slug: 'calcados-esportivos',
        use_in_menu: false
      });

    expect(updateRes.status).toBe(204);

    const deleteRes = await request(app)
      .delete(`/v1/category/${categoryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);
  });

  test('deve criar, buscar e remover produto com categoria e opção', async () => {
    const catRes = await request(app)
      .post('/v1/category')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Camisetas',
        slug: 'camisetas',
        use_in_menu: true
      });

    const catId = catRes.body.id;

    const prodRes = await request(app)
      .post('/v1/product')
      .set('Authorization', `Bearer ${token}`)
      .send({
        enabled: true,
        name: 'Camiseta Básica',
        slug: 'camiseta-basica',
        stock: 15,
        description: 'Malha leve',
        price: 79.9,
        price_with_discount: 59.9,
        category_ids: [catId],
        images: [],
        options: [
          {
            title: 'Tamanho',
            shape: 'square',
            radius: 4,
            type: 'text',
            values: ['P', 'M', 'G']
          }
        ]
      });

    expect(prodRes.status).toBe(201);
    productId = prodRes.body.id;
    expect(prodRes.body.category_ids).toContain(catId);

    const getProdRes = await request(app).get(`/v1/product/${productId}`);
    expect(getProdRes.status).toBe(200);
    expect(getProdRes.body.name).toBe('Camiseta Básica');

    const delProdRes = await request(app)
      .delete(`/v1/product/${productId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delProdRes.status).toBe(204);
  });
});