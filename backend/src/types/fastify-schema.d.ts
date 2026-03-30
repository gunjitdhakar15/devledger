declare module 'fastify' {
    interface FastifySchema {
        description?: string;
        tags?: readonly string[];
    }
}
