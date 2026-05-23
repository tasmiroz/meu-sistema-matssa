-- Usuários iniciais
insert into usuarios (nome, email, senha, perfil, ativo, permissoes) values
('Master Admin', 'admin@matssa.com', 'admin123', 'master', true, '{}'),
('Henrique', 'henrique@matssa.com', 'henrique123', 'operador', true, '{"materiais":true,"ferramentas":true,"precos":false,"cadastros":false}'),
('Carlos', 'carlos@matssa.com', 'carlos123', 'operador', true, '{"materiais":true,"ferramentas":true,"precos":false,"cadastros":false}');

-- Destinos iniciais
insert into destinos (nome, tipo) values
('Matssa', 'base'), ('Sr Danilo', 'obra'), ('UP Brasil', 'obra'),
('Sr Pedro Motel', 'obra'), ('Hotsat', 'parceiro');