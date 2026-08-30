import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "@/services/apiService";
import { enviarNotificacao } from "@/services/emailService";

export type Natureza = "RECEITA" | "DESPESA";

export interface Lancamento {
  id: string;
  vencimento: string;
  descricao: string;
  natureza: Natureza;
  parcelaAtual: number;
  totalParcelas: number;
  valor: number;
  pago: boolean;
  mes: string;
  grupoId: string;
  criadoPorId?: string;
}

// ⚠️ Sem campo "senha" de propósito — a senha nunca fica guardada no app.
// A validação acontece 100% no servidor (ver api.login em apiService.ts).
export interface Usuario {
  id: string;
  nomeCompleto: string;
  email: string;
  criadoEm: string;
}

interface AppContextType {
  usuarios: Usuario[];
  lancamentos: Lancamento[];
  lancamentosArquivados: Lancamento[];
  lancamentosLixeira: Lancamento[];
  usuarioLogado: Usuario | null;
  mesSelecionado: string;
  carregando: boolean;
  login: (nome: string, senha: string) => Promise<boolean>;
  logout: () => void;
  addUsuario: (nome: string, senha: string, email: string) => Promise<void>;
  removeUsuario: (id: string) => Promise<void>;
  addLancamentos: (items: Omit<Lancamento, "id">[]) => Promise<void>;
  updateLancamento: (id: string, data: Partial<Lancamento>) => Promise<void>;
  removeLancamento: (id: string) => Promise<void>;
  excluirDefinitivo: (id: string) => Promise<void>;
  togglePago: (id: string) => Promise<void>;
  arquivar: (ids: string[]) => Promise<void>;
  restaurar: (id: string) => Promise<void>;
  setMesSelecionado: (mes: string) => void;
  getLancamentosByMes: (mes: string) => Lancamento[];
  getMesesDisponiveis: () => string[];
  getMesesArquivados: () => string[];
}

const AppContext = createContext<AppContextType | null>(null);

const CHAVE_SESSAO = "@cf/usuario_logado_id";

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function mesAtualStr(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

function mapLancamento(l: any): Lancamento {
  return {
    id: l.id,
    vencimento: l.vencimento,
    descricao: l.descricao,
    natureza: l.natureza as Natureza,
    parcelaAtual: Number(l.parcelaAtual),
    totalParcelas: Number(l.totalParcelas),
    valor: Number(l.valor),
    pago: Boolean(l.pago),
    mes: l.mes,
    grupoId: l.grupoId,
    criadoPorId: l.criadoPorId ?? undefined,
  };
}

function sortMeses(meses: string[]): string[] {
  return meses.sort((a, b) => {
    const [ma, ya] = a.split("/");
    const [mb, yb] = b.split("/");
    return new Date(+ya, +ma - 1).getTime() - new Date(+yb, +mb - 1).getTime();
  });
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [lancamentosArquivados, setLancamentosArquivados] = useState<Lancamento[]>([]);
  const [lancamentosLixeira, setLancamentosLixeira] = useState<Lancamento[]>([]);
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualStr());
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [users, lancs, arquivados, lixeira, sessaoId] = await Promise.all([
          api.getUsuarios(),
          api.getLancamentos(),
          api.getLancamentosArquivados(),
          api.getLancamentosLixeira(),
          AsyncStorage.getItem(CHAVE_SESSAO),
        ]);

        const usuariosMapped: Usuario[] = users.map((u: any) => ({
          id: u.id,
          nomeCompleto: u.nomeCompleto,
          email: u.email,
          criadoEm: u.criadoEm,
        }));

        setUsuarios(usuariosMapped);
        setLancamentos(lancs.map(mapLancamento));
        setLancamentosArquivados(arquivados.map(mapLancamento));
        setLancamentosLixeira(lixeira.map(mapLancamento));

        if (sessaoId) {
          const user = usuariosMapped.find((u) => u.id === sessaoId);
          if (user) setUsuarioLogado(user);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  // ── Autenticação ──────────────────────────────────────────────────────────
  // Validado no servidor agora (POST /auth/login) — o app nunca mais compara
  // senha localmente nem guarda senha em memória.
  const login = useCallback(async (nome: string, senha: string): Promise<boolean> => {
    try {
      const resposta = await api.login(nome, senha);
      if (!resposta.ok || !resposta.usuario) return false;

      const user: Usuario = {
        id: resposta.usuario.id,
        nomeCompleto: resposta.usuario.nomeCompleto,
        email: resposta.usuario.email,
        criadoEm: resposta.usuario.criadoEm,
      };
      setUsuarioLogado(user);
      AsyncStorage.setItem(CHAVE_SESSAO, user.id);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUsuarioLogado(null);
    AsyncStorage.removeItem(CHAVE_SESSAO);
  }, []);

  // ── Usuários ──────────────────────────────────────────────────────────────
  const addUsuario = async (nome: string, senha: string, email: string) => {
    const id = gerarId();
    const criadoEm = new Date().toISOString();
    // Envia a senha em texto puro só nesta chamada — o servidor criptografa
    // antes de gravar (bcrypt) e nunca a devolve.
    await api.postUsuario({ id, nomeCompleto: nome, senha, email, criadoEm });
    const novoUsuario: Usuario = { id, nomeCompleto: nome, email, criadoEm };
    setUsuarios((prev) => [...prev, novoUsuario]);
  };

  const removeUsuario = async (id: string) => {
    await api.deleteUsuario(id);
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
  };

  // ── Lançamentos ───────────────────────────────────────────────────────────
  const addLancamentos = async (items: Omit<Lancamento, "id">[]) => {
    const newItems: Lancamento[] = items.map((item) => ({
      ...item,
      id: gerarId(),
      criadoPorId: usuarioLogado?.id,
    }));
    await api.postLancamentos(newItems);
    setLancamentos((prev) => [...prev, ...newItems]);

    if (items.length > 0) {
      const primeiro = items[0];
      enviarNotificacao({
        acao: "criar",
        descricao: primeiro.descricao,
        valor: primeiro.valor,
        natureza: primeiro.natureza,
        mes: primeiro.mes,
        parcelas: primeiro.totalParcelas,
        usuario: usuarioLogado?.nomeCompleto,
      });
    }
  };

  const updateLancamento = async (id: string, data: Partial<Lancamento>) => {
    const original = lancamentos.find((l) => l.id === id);
    if (!original) return;
    const atualizado = { ...original, ...data };
    await api.putLancamento(id, atualizado);
    setLancamentos((prev) => prev.map((l) => (l.id === id ? atualizado : l)));

    enviarNotificacao({
      acao: "editar",
      descricao: atualizado.descricao,
      valor: atualizado.valor,
      natureza: atualizado.natureza,
      mes: atualizado.mes,
      usuario: usuarioLogado?.nomeCompleto,
    });
  };

  // Excluir agora manda para a Lixeira (recuperável) em vez de apagar na hora.
  const removeLancamento = async (id: string) => {
    const original = lancamentos.find((l) => l.id === id);
    await api.excluirLancamento(id);
    const restantes = lancamentos.filter((l) => l.id !== id);
    setLancamentos(restantes);
    if (original) {
      setLancamentosLixeira((prev) => [original, ...prev]);
      enviarNotificacao({
        acao: "excluir",
        descricao: original.descricao,
        valor: original.valor,
        natureza: original.natureza,
        mes: original.mes,
        usuario: usuarioLogado?.nomeCompleto,
      });
    }

    const mesesRestantes = new Set(restantes.map((l) => l.mes));
    if (!mesesRestantes.has(mesSelecionado)) {
      const sorted = sortMeses(Array.from(mesesRestantes));
      setMesSelecionado(sorted.length > 0 ? sorted[sorted.length - 1] : mesAtualStr());
    }
  };

  // 🆕 Excluir definitivamente — só deve ser chamado a partir da tela de Lixeira. Sem volta.
  const excluirDefinitivo = async (id: string) => {
    await api.excluirDefinitivo(id);
    setLancamentosLixeira((prev) => prev.filter((l) => l.id !== id));
  };

  const togglePago = async (id: string) => {
    const lancamento = lancamentos.find((l) => l.id === id);
    if (!lancamento) return;
    const novoPago = !lancamento.pago;
    await api.patchPago(id, novoPago);
    setLancamentos((prev) =>
      prev.map((l) => (l.id === id ? { ...l, pago: novoPago } : l))
    );
  };

  const arquivar = async (ids: string[]) => {
    if (ids.length === 0) return;
    await api.patchArquivar(ids);
    const arquivando = lancamentos.filter((l) => ids.includes(l.id));
    setLancamentos((prev) => prev.filter((l) => !ids.includes(l.id)));
    setLancamentosArquivados((prev) => [...prev, ...arquivando]);
  };

  // Restaura tanto do Arquivo quanto da Lixeira — em ambos os casos volta pra lista ativa.
  const restaurar = async (id: string) => {
    await api.patchRestaurar(id);
    const doArquivo = lancamentosArquivados.find((l) => l.id === id);
    const daLixeira = lancamentosLixeira.find((l) => l.id === id);
    const item = doArquivo ?? daLixeira;
    if (doArquivo) setLancamentosArquivados((prev) => prev.filter((l) => l.id !== id));
    if (daLixeira) setLancamentosLixeira((prev) => prev.filter((l) => l.id !== id));
    if (item) setLancamentos((prev) => [...prev, item]);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getLancamentosByMes = useCallback(
    (mes: string) => lancamentos.filter((l) => l.mes === mes),
    [lancamentos]
  );

  const getMesesDisponiveis = useCallback(() => {
    const meses = new Set(lancamentos.map((l) => l.mes));
    return sortMeses(Array.from(meses));
  }, [lancamentos]);

  const getMesesArquivados = useCallback(() => {
    const meses = new Set(lancamentosArquivados.map((l) => l.mes));
    return sortMeses(Array.from(meses));
  }, [lancamentosArquivados]);

  return (
    <AppContext.Provider
      value={{
        usuarios,
        lancamentos,
        lancamentosArquivados,
        lancamentosLixeira,
        usuarioLogado,
        mesSelecionado,
        carregando,
        login,
        logout,
        addUsuario,
        removeUsuario,
        addLancamentos,
        updateLancamento,
        removeLancamento,
        excluirDefinitivo,
        togglePago,
        arquivar,
        restaurar,
        setMesSelecionado,
        getLancamentosByMes,
        getMesesDisponiveis,
        getMesesArquivados,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de AppProvider");
  return ctx;
}
