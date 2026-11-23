const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_local_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function formatUser(user) {
  return {
    id: user.id,
    firstname: user.firstname,
    surname: user.surname,
    email: user.email
  };
}

async function getUserById(id) {
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return { status: 400, body: { error: 'ID de usuário inválido' } };
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return { status: 404, body: { error: 'Usuário não encontrado' } };
  }

  return { status: 200, body: formatUser(user) };
}

async function createUser(data) {
  const { firstname, surname, email, password, confirmPassword } = data || {};

  if (!firstname || !surname || !email || !password) {
    return {
      status: 400,
      body: { error: 'Campos obrigatórios: firstname, surname, email e password' }
    };
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return {
      status: 400,
      body: { error: 'As senhas não conferem' }
    };
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return { status: 400, body: { error: 'E-mail já cadastrado' } };
  }

  const created = await User.create({
    firstname: String(firstname).trim(),
    surname: String(surname).trim(),
    email: String(email).trim().toLowerCase(),
    password
  });

  return { status: 201, body: formatUser(created) };
}

async function updateUser(id, data) {
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return { status: 400, body: { error: 'ID de usuário inválido' } };
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return { status: 404, body: { error: 'Usuário não encontrado' } };
  }

  const { firstname, surname, email, password } = data || {};

  if (email && email.trim().toLowerCase() !== user.email) {
    const emailInUse = await User.findOne({
      where: { email: email.trim().toLowerCase() }
    });
    if (emailInUse) {
      return { status: 400, body: { error: 'E-mail já está em uso' } };
    }
    user.email = email.trim().toLowerCase();
  }

  if (firstname !== undefined) {
    user.firstname = String(firstname).trim();
  }
  if (surname !== undefined) {
    user.surname = String(surname).trim();
  }
  if (password) {
    user.password = password;
  }

  await user.save();

  return { status: 204, body: null };
}

async function deleteUser(id) {
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return { status: 400, body: { error: 'ID de usuário inválido' } };
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return { status: 404, body: { error: 'Usuário não encontrado' } };
  }

  await user.destroy();

  return { status: 204, body: null };
}

async function generateToken(data) {
  const { email, password } = data || {};

  if (!email || !password) {
    return {
      status: 400,
      body: { error: 'E-mail e senha são obrigatórios' }
    };
  }

  const user = await User.findOne({
    where: { email: String(email).trim().toLowerCase() }
  });

  if (!user) {
    return { status: 400, body: { error: 'Credenciais inválidas' } };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return { status: 400, body: { error: 'Credenciais inválidas' } };
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { status: 200, body: { token } };
}

module.exports = {
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  generateToken
};