import { FastifyInstance } from 'fastify'

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (req, reply) => {
    const { username, password } = req.body as { username: string; password: string }

    const validUsername = process.env.AUTH_USERNAME || 'admin'
    const validPassword = process.env.AUTH_PASSWORD || 'admin123'

    if (username !== validUsername || password !== validPassword) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = app.jwt.sign({ username }, { expiresIn: '7d' })
    return { token }
  })
}
