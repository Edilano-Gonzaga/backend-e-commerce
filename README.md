# E-commerce Backend API

API REST desenvolvida em **Node.js**, **Express**, **Sequelize** e **MySQL**, com autenticação via **JWT**, hash de senhas com **bcrypt** e testes automatizados de integração com **Jest** e **Supertest**.

## Tecnologias Utilizadas

- **Node.js** e **Express**
- **MySQL** (via XAMPP no ambiente local)
- **Sequelize** (ORM)
- **JSON Web Token (JWT)** e **bcrypt**
- **Jest** e **cross-env** para testes automatizados

## Configuração do Ambiente

1. Instale as dependências do projeto:
   ```bash
   npm install
   ```

2. Crie o arquivo `.env` na raiz do projeto (você pode usar o `.env.example` como base, se existir):
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASS=
   DB_NAME=ecommerce_db
   DB_TEST_NAME=ecommerce_test_db
   JWT_SECRET=sua_chave_secreta_aqui
   JWT_EXPIRES_IN=24h
   ```

3. Inicie o serviço do **MySQL** no XAMPP e crie os bancos de dados:
   ```sql
   CREATE DATABASE IF NOT EXISTS ecommerce_db;
   CREATE DATABASE IF NOT EXISTS ecommerce_test_db;
   ```

## Executando a Aplicação

- **Modo desenvolvimento (com Nodemon):**
  ```bash
  npm run dev
  ```

- **Rodar os testes automatizados:**
  ```bash
  npm test
  ```

## Principais Rotas

- `POST /v1/user` — Cadastro de usuário
- `POST /v1/user/token` — Autenticação e geração de token JWT
- `GET /v1/user/:id` — Consulta de usuário por ID
- `PUT /v1/user/:id` — Atualização de usuário (requer token JWT)
- `DELETE /v1/user/:id` — Remoção de usuário (requer token JWT)
- Rotas de **Categorias** e **Produtos** (`/v1/category/...`, `/v1/product/...`)