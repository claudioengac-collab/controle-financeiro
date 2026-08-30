import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lancamento, Natureza, useApp } from "@/context/AppContext";

interface Props {
  visible: boolean;
  tipo: Natureza;
  onClose: () => void;
  onSelecionarMes: (mes: string) => void;
  onAcumular?: (meses: string[]) => void;
}

const MESES_PT = [
  "Jan","Fev","Mar","Abr","Mai","Jun",
  "Jul","Ago","Set","Out","Nov","Dez",
];

function formatMesNome(mes: string): string {
  const [m, y] = mes.split("/");
  return `${MESES_PT[parseInt(m) - 1]}/${y}`;
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface MesResumo {
  mes: string;
  mesNome: string;
  qtd: number;
  total: number;
  pago: number;
  pendente: number;
}

type Aba = "resumo" | "todos";

export function LupaModal({ visible, tipo, onClose, onSelecionarMes, onAcumular }: Props) {
  const { lancamentos } = useApp();
  const insets = useSafeAreaInsets();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aba, setAba] = useState<Aba>("resumo");

  const cor = tipo === "RECEITA" ? "#1B5E20" : "#C62828";
  const titulo = tipo === "RECEITA" ? "Banco de Dados - Receitas" : "Banco de Dados - Despesas";

  const resumos = useMemo<MesResumo[]>(() => {
    const filtrados = lancamentos.filter((l) => l.natureza === tipo);
    const mapa = new Map<string, MesResumo>();
    for (const l of filtrados) {
      const atual = mapa.get(l.mes) ?? {
        mes: l.mes,
        mesNome: formatMesNome(l.mes),
        qtd: 0,
        total: 0,
        pago: 0,
        pendente: 0,
      };
      atual.qtd += 1;
      atual.total += l.valor;
      if (l.pago) atual.pago += l.valor;
      else atual.pendente += l.valor;
      mapa.set(l.mes, atual);
    }
    return Array.from(mapa.values()).sort((a, b) => {
      const [ma, ya] = a.mes.split("/");
      const [mb, yb] = b.mes.split("/");
      return new Date(+ya, +ma - 1).getTime() - new Date(+yb, +mb - 1).getTime();
    });
  }, [lancamentos, tipo]);

  const todosLancamentos = useMemo<Lancamento[]>(() => {
    return lancamentos
      .filter((l) => l.natureza === tipo)
      .sort((a, b) => {
        const [da, ma, ya] = a.vencimento.split("/");
        const [db, mb, yb] = b.vencimento.split("/");
        return new Date(+ya, +ma - 1, +da).getTime() - new Date(+yb, +mb - 1, +db).getTime();
      });
  }, [lancamentos, tipo]);

  const acumuladoSelecionados = useMemo(() => {
    if (selecionados.size === 0) return { total: 0, pago: 0, pendente: 0, qtd: 0 };
    const itens = lancamentos.filter(
      (l) => l.natureza === tipo && selecionados.has(l.mes)
    );
    return {
      total: itens.reduce((s, l) => s + l.valor, 0),
      pago: itens.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0),
      pendente: itens.filter((l) => !l.pago).reduce((s, l) => s + l.valor, 0),
      qtd: itens.length,
    };
  }, [selecionados, lancamentos, tipo]);

  const todosSelecionados = resumos.length > 0 && selecionados.size === resumos.length;

  function toggleMes(mes: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(mes)) next.delete(mes);
      else next.add(mes);
      return next;
    });
  }

  function toggleTodos() {
    if (todosSelecionados) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(resumos.map((r) => r.mes)));
    }
  }

  function handleCarregarAcumulado() {
    if (selecionados.size === 0) return;
    onAcumular?.(Array.from(selecionados));
    onClose();
  }

  function handleClose() {
    setSelecionados(new Set());
    setAba("resumo");
    onClose();
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { paddingTop: topPad }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: cor }]}>
          <Feather name="database" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>{titulo}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Abas */}
        <View style={styles.abaRow}>
          <TouchableOpacity
            style={[styles.aba, aba === "resumo" && { ...styles.abaAtiva, borderBottomColor: cor }]}
            onPress={() => setAba("resumo")}
          >
            <Text style={[styles.abaText, aba === "resumo" && { color: cor, fontWeight: "bold" }]}>
              POR MÊS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.aba, aba === "todos" && { ...styles.abaAtiva, borderBottomColor: cor }]}
            onPress={() => setAba("todos")}
          >
            <Text style={[styles.abaText, aba === "todos" && { color: cor, fontWeight: "bold" }]}>
              TODOS OS LANÇAMENTOS
            </Text>
          </TouchableOpacity>
        </View>

        {aba === "resumo" ? (
          <>
            {/* Cabeçalho tabela */}
            <View style={styles.tableHeader}>
              <TouchableOpacity style={{ width: 36, alignItems: "center" }} onPress={toggleTodos}>
                <Feather
                  name={todosSelecionados ? "check-square" : "square"}
                  size={16}
                  color="#fff"
                />
              </TouchableOpacity>
              <Text style={[styles.th, { flex: 1 }]}>MÊS</Text>
              <Text style={[styles.th, { width: 38, textAlign: "center" }]}>ITENS</Text>
              <Text style={[styles.th, { width: 88, textAlign: "right" }]}>TOTAL</Text>
              <Text style={[styles.th, { width: 88, textAlign: "right" }]}>PENDENTE</Text>
              <Text style={[styles.th, { width: 36 }]}></Text>
            </View>

            {resumos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="inbox" size={40} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  Nenhum lançamento de {tipo === "RECEITA" ? "receita" : "despesa"} encontrado.
                </Text>
              </View>
            ) : (
              <FlatList
                data={resumos}
                keyExtractor={(item) => item.mes}
                renderItem={({ item, index }) => {
                  const marcado = selecionados.has(item.mes);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.row,
                        index % 2 === 1 && styles.rowEven,
                        marcado && styles.rowSelecionado,
                      ]}
                      onPress={() => toggleMes(item.mes)}
                    >
                      <View style={{ width: 36, alignItems: "center" }}>
                        <Feather
                          name={marcado ? "check-square" : "square"}
                          size={16}
                          color={marcado ? cor : "#9CA3AF"}
                        />
                      </View>
                      <Text style={[styles.td, { flex: 1, fontWeight: "600", color: cor }]}>
                        {item.mesNome}
                      </Text>
                      <Text style={[styles.td, { width: 38, textAlign: "center" }]}>
                        {item.qtd}
                      </Text>
                      <Text style={[styles.td, { width: 88, textAlign: "right" }]}>
                        {formatBRL(item.total)}
                      </Text>
                      <Text style={[styles.td, { width: 88, textAlign: "right", color: "#C62828" }]}>
                        {formatBRL(item.pendente)}
                      </Text>
                      <TouchableOpacity
                        style={{ width: 36, alignItems: "center" }}
                        onPress={() => {
                          onSelecionarMes(item.mes);
                          handleClose();
                        }}
                      >
                        <Feather name="arrow-right" size={14} color={cor} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Painel acumulado */}
            {selecionados.size > 0 && (
              <View style={[styles.acumuladoBox, { borderColor: cor }]}>
                <Text style={[styles.acumuladoTitulo, { color: cor }]}>
                  TOTAL ACUMULADO — {selecionados.size} {selecionados.size === 1 ? "mês" : "meses"} selecionado{selecionados.size === 1 ? "" : "s"}
                </Text>
                <View style={styles.acumuladoRow}>
                  <View style={styles.acumuladoItem}>
                    <Text style={styles.acumuladoLabel}>TOTAL</Text>
                    <Text style={[styles.acumuladoValor, { color: cor }]}>
                      {formatBRL(acumuladoSelecionados.total)}
                    </Text>
                  </View>
                  <View style={styles.acumuladoItem}>
                    <Text style={styles.acumuladoLabel}>PAGO</Text>
                    <Text style={[styles.acumuladoValor, { color: "#1B5E20" }]}>
                      {formatBRL(acumuladoSelecionados.pago)}
                    </Text>
                  </View>
                  <View style={styles.acumuladoItem}>
                    <Text style={styles.acumuladoLabel}>PENDENTE</Text>
                    <Text style={[styles.acumuladoValor, { color: "#C62828" }]}>
                      {formatBRL(acumuladoSelecionados.pendente)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.btnCarregar, { backgroundColor: cor }]}
                  onPress={handleCarregarAcumulado}
                >
                  <Feather name="layers" size={14} color="#fff" />
                  <Text style={styles.btnCarregarText}>
                    CARREGAR ACUMULADO NA TELA PRINCIPAL
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          /* Aba Todos os Lançamentos */
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 74 }]}>VENC.</Text>
              <Text style={[styles.th, { flex: 1 }]}>DESCRIÇÃO</Text>
              <Text style={[styles.th, { width: 54 }]}>MÊS</Text>
              <Text style={[styles.th, { width: 88, textAlign: "right" }]}>VALOR</Text>
              <Text style={[styles.th, { width: 32, textAlign: "center" }]}>PG</Text>
            </View>

            {todosLancamentos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="inbox" size={40} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  Nenhum lançamento encontrado.
                </Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={todosLancamentos}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => (
                    <View style={[styles.row, index % 2 === 1 && styles.rowEven]}>
                      <Text style={[styles.td, { width: 74, fontSize: 11 }]}>{item.vencimento}</Text>
                      <Text style={[styles.td, { flex: 1, fontSize: 12 }]} numberOfLines={1}>
                        {item.descricao}
                        {item.totalParcelas > 1 ? ` (${item.parcelaAtual}/${item.totalParcelas})` : ""}
                      </Text>
                      <Text style={[styles.td, { width: 54, fontSize: 11, color: cor }]}>
                        {formatMesNome(item.mes)}
                      </Text>
                      <Text style={[styles.td, { width: 88, textAlign: "right", fontSize: 11 }]}>
                        {formatBRL(item.valor)}
                      </Text>
                      <View style={{ width: 32, alignItems: "center" }}>
                        <Feather
                          name={item.pago ? "check-square" : "square"}
                          size={14}
                          color={item.pago ? "#2E7D32" : "#9CA3AF"}
                        />
                      </View>
                    </View>
                  )}
                />
                {/* Rodapé geral */}
                <View style={[styles.totalGeralBox, { borderTopColor: cor }]}>
                  <Text style={[styles.totalGeralLabel, { color: cor }]}>
                    RELATÓRIO GERAL — {todosLancamentos.length} lançamento{todosLancamentos.length !== 1 ? "s" : ""}
                  </Text>
                  <Text style={styles.totalGeralValor}>
                    Total: {formatBRL(todosLancamentos.reduce((s, l) => s + l.valor, 0))}
                  </Text>
                </View>
              </>
            )}
          </>
        )}

        <TouchableOpacity
          style={[styles.btnFechar, { backgroundColor: cor, marginBottom: insets.bottom + 12 }]}
          onPress={handleClose}
        >
          <Text style={styles.btnFecharText}>FECHAR</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "bold" },
  closeBtn: { padding: 4 },
  abaRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  aba: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  abaAtiva: {
    borderBottomWidth: 3,
  },
  abaText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#374151",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  th: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  rowEven: { backgroundColor: "#F9FAFB" },
  rowSelecionado: { backgroundColor: "#EFF6FF" },
  td: { fontSize: 13, color: "#111827" },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },
  acumuladoBox: {
    margin: 10,
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  acumuladoTitulo: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  acumuladoRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  acumuladoItem: { flex: 1, alignItems: "center" },
  acumuladoLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  acumuladoValor: {
    fontSize: 13,
    fontWeight: "bold",
  },
  btnCarregar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 6,
    paddingVertical: 10,
  },
  btnCarregarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  totalGeralBox: {
    borderTopWidth: 2,
    padding: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalGeralLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  totalGeralValor: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111827",
  },
  btnFechar: {
    margin: 12,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  btnFecharText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
