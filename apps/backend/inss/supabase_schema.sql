-- Extensão necessária para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whatsapp VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(255),
    cpf VARCHAR(14),
    nit VARCHAR(20),
    tipo_contribuinte VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de guias emitidas
CREATE TABLE IF NOT EXISTS guias_inss (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo_gps VARCHAR(10),
    competencia VARCHAR(7),
    valor DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pendente',
    pdf_url TEXT,
    data_vencimento DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de conversas
CREATE TABLE IF NOT EXISTS conversas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    mensagem TEXT,
    resposta TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

