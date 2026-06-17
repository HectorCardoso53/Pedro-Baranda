# Facilita Imobiliária — ERP Interno

Plataforma web interna para gestão patrimonial imobiliária. Gerencia lotes, vendas, clientes, financeiro, inadimplência, contratos e promissórias.

## Tecnologias

- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui + TanStack Query/Table + Recharts
- **Backend**: Node.js + Express + TypeScript + Firebase Admin SDK + Puppeteer
- **Banco de dados**: Firebase Firestore + Firebase Storage
- **Auth**: Firebase Authentication + JWT
- **Infraestrutura**: Docker + Docker Compose + Nginx

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- Projeto no [Firebase](https://console.firebase.google.com/) criado com:
  - **Authentication** habilitado (provedor: E-mail/Senha)
  - **Firestore Database** criado (modo produção)
  - **Storage** habilitado
  - **Conta de serviço** gerada (chave JSON)

---

## Configuração

### 1. Variáveis de ambiente do backend

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env` com as credenciais do Firebase:

```env
# Firebase Admin SDK (da chave JSON da conta de serviço)
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# JWT
JWT_SECRET=uma-string-longa-e-aleatoria-aqui

# CORS — origens permitidas (separadas por vírgula)
ALLOWED_ORIGINS=http://localhost,http://localhost:5173

# PIX
PIX_CHAVE=chave-pix-da-empresa
PIX_NOME=FACILITA IMOBILIARIA
PIX_CIDADE=SAO PAULO

# Node
NODE_ENV=development
PORT=3333
```

> **Nota sobre FIREBASE_PRIVATE_KEY**: Copie a chave exatamente como aparece no JSON da conta de serviço, incluindo as aspas externas. As quebras de linha devem ser `\n` literais.

### 2. Variáveis de ambiente do frontend

```bash
cp frontend/.env.example frontend/.env
```

Edite `frontend/.env` com as credenciais do Firebase SDK web (encontradas em Configurações do Projeto → Seus apps → App web):

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=seu-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-project-id
VITE_FIREBASE_STORAGE_BUCKET=seu-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## Executar com Docker

```bash
# Na raiz do projeto
docker-compose up --build
```

Aguarde os containers subirem. A aplicação estará disponível em:

| Serviço    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost            |
| Backend    | http://localhost/api        |
| Frontend direto | http://localhost:5173  |
| Backend direto  | http://localhost:3333  |

Para rodar em segundo plano:

```bash
docker-compose up --build -d
```

Para parar:

```bash
docker-compose down
```

---

## Criar o primeiro usuário administrador

O primeiro usuário admin deve ser criado manualmente via Firebase Console:

1. Acesse o [Firebase Console](https://console.firebase.google.com/) → **Authentication** → **Users**
2. Clique em **Add user** e informe e-mail e senha
3. Copie o **UID** gerado
4. Acesse **Firestore** → coleção `usuarios` → **Add document**
5. Use o UID como ID do documento e adicione os campos:

```
uid: "UID_COPIADO"
nome: "Administrador"
email: "admin@empresa.com"
role: "admin"
ativo: true
criadoEm: (timestamp atual)
```

Após isso, faça login normalmente pela interface em http://localhost.

---

## Criar usuários adicionais

Com um usuário admin logado, acesse **Configurações** → **Usuários do Sistema** → **Novo Usuário**.

Roles disponíveis:
| Role         | Descrição                              |
|--------------|----------------------------------------|
| `admin`      | Acesso total, gerência de usuários     |
| `gerencia`   | Relatórios, visão geral                |
| `financeiro` | Pagamentos, repasses, financeiro       |
| `atendimento`| Vendas, clientes, parcelas             |
| `proprietario`| Acesso restrito ao painel do proprietário |

---

## Desenvolvimento

Os containers usam volumes para hot reload:

- **Frontend**: Mudanças em `frontend/src/` são refletidas imediatamente via Vite HMR
- **Backend**: Mudanças em `backend/src/` reiniciam o servidor via nodemon

Ver logs em tempo real:

```bash
# Todos os serviços
docker-compose logs -f

# Apenas backend
docker-compose logs -f backend

# Apenas frontend
docker-compose logs -f frontend
```

Entrar no container do backend:

```bash
docker-compose exec backend sh
```

---

## Índices recomendados no Firestore

Crie os seguintes índices compostos no Firestore Console para otimizar as queries:

| Coleção      | Campos                                      |
|--------------|---------------------------------------------|
| `parcelas`   | `vendaId ASC` + `vencimento ASC`            |
| `parcelas`   | `status ASC` + `vencimento ASC`             |
| `pagamentos` | `parcelaId ASC` + `dataPagamento DESC`      |
| `vendas`     | `projetoId ASC` + `status ASC`              |
| `vendas`     | `proprietarioId ASC` + `criadoEm DESC`      |
| `movimentacoes` | `tipo ASC` + `data DESC`               |
| `repasses`   | `proprietarioId ASC` + `status ASC`         |

> O Firestore geralmente sugere os índices faltantes nos logs de erro — basta clicar no link fornecido.

---

## Estrutura do projeto

```
facilita-imobiliaria/
├── docker-compose.yml
├── nginx/
│   ├── Dockerfile
│   └── default.conf
├── backend/
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── firebase/admin.ts
│       ├── middlewares/
│       ├── routes/
│       ├── services/
│       ├── utils/
│       ├── jobs/
│       └── templates/
└── frontend/
    ├── Dockerfile
    ├── .env.example
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── src/
        ├── App.tsx
        ├── contexts/
        ├── layouts/
        ├── pages/
        ├── components/
        ├── services/
        ├── utils/
        └── types/
```

---

## Job de inadimplência

Um job automático roda diariamente às **01:00 (horário de Brasília)** e:

1. Busca todas as parcelas com `status = "pendente"` e `vencimento < hoje`
2. Atualiza para `status = "vencida"`
3. Atualiza as promissórias vinculadas para `status = "vencida"`

Para disparar manualmente:

```
POST /api/inadimplencia/processar
Authorization: Bearer <token-admin>
```

---

## Deploy em produção (VPS Hostinger)

1. Instale Docker e Docker Compose na VPS
2. Clone o repositório e configure os arquivos `.env`
3. Atualize `ALLOWED_ORIGINS` no `backend/.env` com o domínio real
4. Configure SSL com Certbot + Nginx externo (ou use o próprio Nginx do container com certificado Let's Encrypt montado como volume)
5. Execute `docker-compose up --build -d`
6. Configure firewall para liberar apenas as portas 80 e 443

```bash
# Exemplo de build para produção
docker-compose -f docker-compose.yml up --build -d
```

---

## Suporte

Para dúvidas ou problemas, verifique os logs dos containers:

```bash
docker-compose logs -f
```
