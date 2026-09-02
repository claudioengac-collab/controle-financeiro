import { Feather } from "@expo/vector-icons";
import * as Print from "expo-print";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lancamento, Natureza, useApp } from "@/context/AppContext";
import { AlertaModal } from "@/components/AlertaModal";
import { CadastroUsuariosModal } from "@/components/CadastroUsuariosModal";


import { EditarModal } from "@/components/EditarModal";
import { LupaModal } from "@/components/LupaModal";

const MESES_PT = [
  "JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO",
  "JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO",
];

function getMesNome(mes: string): string {
  const [m, y] = mes.split("/");
  return `${MESES_PT[parseInt(m) - 1]}/${y}`;
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function maskDate(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function gerarIdLocal(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function MainScreen() {
  const {
    usuarioLogado,
    logout,
    lancamentos,
    lancamentosArquivados,
    lancamentosLixeira,
    mesSelecionado,
    setMesSelecionado,
    getMesesDisponiveis,
    getMesesArquivados,
    addLancamentos,
    removeLancamento,
    excluirDefinitivo,
    togglePago,
    arquivar,
    restaurar,
  } = useApp();
  const insets = useSafeAreaInsets();

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [natureza, setNatureza] = useState<Natureza>("DESPESA");
  const [parcelas, setParcelas] = useState("1");
  const [dataVenc, setDataVenc] = useState("");
  const [formVisible, setFormVisible] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fluxosPeriodo, setFluxosPeriodo] = useState(false);
  const [showMesModal, setShowMesModal] = useState(false);
  const [mesesAcumulados, setMesesAcumulados] = useState<string[]>([]);
  const [modalSelecionados, setModalSelecionados] = useState<Set<string>>(new Set());
  const [showLupaReceita, setShowLupaReceita] = useState(false);
  const [showLupaDespesa, setShowLupaDespesa] = useState(false);
  const [showCadastro, setShowCadastro] = useState(false);
  const [showEditar, setShowEditar] = useState(false);
  const [showArquivarModal, setShowArquivarModal] = useState(false);
  const [arquivarSelecionados, setArquivarSelecionados] = useState<Set<string>>(new Set());
  const [filtroArquivar, setFiltroArquivar] = useState("");
  const [modoArquivo, setModoArquivo] = useState(false);
  const [showArquivoMesModal, setShowArquivoMesModal] = useState(false);
  const [modalArquivoMeses, setModalArquivoMeses] = useState<Set<string>>(new Set());
  const [mesesArquivoAtivos, setMesesArquivoAtivos] = useState<string[]>([]);
  const [modoLixeira, setModoLixeira] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [alertaVis, setAlertaVis] = useState(false);
  const [alertaTitulo, setAlertaTitulo] = useState("");
  const [alertaMsg, setAlertaMsg] = useState("");
  type ABotao = { texto: string; estilo?: "normal" | "destrutivo" | "cancelar"; onPress: () => void };
  const [alertaBotoes, setAlertaBotoes] = useState<ABotao[]>([]);

  const alerta = (titulo: string, mensagem?: string, botoes?: ABotao[]) => {
    setAlertaTitulo(titulo);
    setAlertaMsg(mensagem ?? "");
    setAlertaBotoes(botoes ?? [{ texto: "OK", estilo: "normal", onPress: () => setAlertaVis(false) }]);
    setAlertaVis(true);
  };

  const modoAcumulado = mesesAcumulados.length > 1;

  const lancsMes = useMemo(
    () => lancamentos.filter((l) => l.mes === mesSelecionado),
    [lancamentos, mesSelecionado]
  );

  const lancsAcumulados = useMemo(
    () =>
      modoAcumulado
        ? lancamentos.filter((l) => mesesAcumulados.includes(l.mes))
        : lancsMes,
    [lancamentos, mesesAcumulados, lancsMes, modoAcumulado]
  );

  const sorted = useMemo<Lancamento[]>(
    () => [
      ...lancsAcumulados.filter((l) => l.natureza === "RECEITA"),
      ...lancsAcumulados.filter((l) => l.natureza === "DESPESA"),
    ],
    [lancsAcumulados]
  );

  const totalReceita = useMemo(
    () =>
      lancsAcumulados
        .filter((l) => l.natureza === "RECEITA")
        .reduce((s, l) => s + l.valor, 0),
    [lancsAcumulados]
  );

  const totalDespesa = useMemo(
    () =>
      lancsAcumulados
        .filter((l) => l.natureza === "DESPESA")
        .reduce((s, l) => s + l.valor, 0),
    [lancsAcumulados]
  );

  const vlPago = useMemo(
    () => lancsAcumulados
      .filter((l) => l.natureza === "DESPESA" && l.pago)
      .reduce((s, l) => s + l.valor, 0),
    [lancsAcumulados]
  );

  const vlPendente = useMemo(
    () => lancsAcumulados
      .filter((l) => l.natureza === "DESPESA" && !l.pago)
      .reduce((s, l) => s + l.valor, 0),
    [lancsAcumulados]
  );

  const saldo = useMemo(
    () => totalReceita - vlPago,
    [totalReceita, vlPago]
  );

  const selectedItem = sorted.find((l) => l.id === selectedId) ?? null;
  const mesesDisponiveis = getMesesDisponiveis();
  const mesesArquivados = getMesesArquivados();

  const lancsArquivadosFiltrados = useMemo(
    () =>
      mesesArquivoAtivos.length > 0
        ? lancamentosArquivados.filter((l) => mesesArquivoAtivos.includes(l.mes))
        : [],
    [lancamentosArquivados, mesesArquivoAtivos]
  );

  const sortedArquivados = useMemo<Lancamento[]>(
    () => [
      ...lancsArquivadosFiltrados.filter((l) => l.natureza === "RECEITA"),
      ...lancsArquivadosFiltrados.filter((l) => l.natureza === "DESPESA"),
    ],
    [lancsArquivadosFiltrados]
  );

  const sortedFiltrado = useMemo<Lancamento[]>(() => {
    if (!filtroTexto.trim()) return sorted;
    const q = filtroTexto.toLowerCase();
    return sorted.filter(
      (l) =>
        l.descricao.toLowerCase().includes(q) ||
        (l.natureza === "RECEITA" ? "rec" : "desp").includes(q) ||
        l.vencimento.includes(q) ||
        getMesNome(l.mes).toLowerCase().includes(q) ||
        String(l.valor).includes(q)
    );
  }, [sorted, filtroTexto]);

  const sortedArquivadosFiltrado = useMemo<Lancamento[]>(() => {
    if (!filtroTexto.trim()) return sortedArquivados;
    const q = filtroTexto.toLowerCase();
    return sortedArquivados.filter(
      (l) =>
        l.descricao.toLowerCase().includes(q) ||
        (l.natureza === "RECEITA" ? "rec" : "desp").includes(q) ||
        l.vencimento.includes(q) ||
        getMesNome(l.mes).toLowerCase().includes(q) ||
        String(l.valor).includes(q)
    );
  }, [sortedArquivados, filtroTexto]);

  // 🆕 Lixeira — mesmo padrão do Arquivo, mas sem filtro por período (lista tudo)
  const sortedLixeira = useMemo<Lancamento[]>(
    () => [
      ...lancamentosLixeira.filter((l) => l.natureza === "RECEITA"),
      ...lancamentosLixeira.filter((l) => l.natureza === "DESPESA"),
    ],
    [lancamentosLixeira]
  );

  const sortedLixeiraFiltrado = useMemo<Lancamento[]>(() => {
    if (!filtroTexto.trim()) return sortedLixeira;
    const q = filtroTexto.toLowerCase();
    return sortedLixeira.filter(
      (l) =>
        l.descricao.toLowerCase().includes(q) ||
        (l.natureza === "RECEITA" ? "rec" : "desp").includes(q) ||
        l.vencimento.includes(q) ||
        getMesNome(l.mes).toLowerCase().includes(q) ||
        String(l.valor).includes(q)
    );
  }, [sortedLixeira, filtroTexto]);

  const todosNaoArquivados = useMemo(
    () =>
      [...lancamentos].sort((a, b) => {
        if (a.mes !== b.mes) return a.mes > b.mes ? 1 : -1;
        return a.vencimento > b.vencimento ? 1 : -1;
      }),
    [lancamentos]
  );

  const todosNaoArquivadosFiltrados = useMemo(() => {
    const q = filtroArquivar.trim().toLowerCase();
    if (!q) return todosNaoArquivados;
    return todosNaoArquivados.filter(
      (l) =>
        l.descricao.toLowerCase().includes(q) ||
        (l.natureza === "RECEITA" ? "receita" : "despesa").includes(q) ||
        getMesNome(l.mes).toLowerCase().includes(q) ||
        String(l.valor).includes(q)
    );
  }, [todosNaoArquivados, filtroArquivar]);

  const handleArquivar = () => {
    if (arquivarSelecionados.size === 0) {
      alerta("Atenção", "Selecione ao menos um item para arquivar.");
      return;
    }
    alerta(
      "Arquivar itens",
      `Deseja arquivar ${arquivarSelecionados.size} item(ns) selecionado(s)? Você poderá restaurá-los depois pela seção ARQUIVO.`,
      [
        { texto: "CANCELAR", estilo: "cancelar", onPress: () => setAlertaVis(false) },
        {
          texto: "SIM, ARQUIVAR",
          estilo: "destrutivo",
          onPress: async () => {
            setAlertaVis(false);
            await arquivar(Array.from(arquivarSelecionados));
            setArquivarSelecionados(new Set());
            setShowArquivarModal(false);
          },
        },
      ]
    );
  };

  const handleValorChange = (text: string) => {
    const digits = text.replace(/\D/g, "");
    const num = parseInt(digits || "0") / 100;
    setValor(
      num.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const limparForm = () => {
    setDescricao("");
    setValor("");
    setNatureza("DESPESA");
    setParcelas("1");
    setDataVenc("");
  };

  const limparGeral = () => {
    limparForm();
    setSelectedId(null);
    setFluxosPeriodo(false);
    setMesesAcumulados([]);
    const now = new Date();
    setMesSelecionado(
      `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`
    );
  };

  const handleLancar = async () => {
    if (!descricao.trim()) {
      alerta("Atenção", "Informe a descrição do lançamento.");
      return;
    }
    const valorNum = parseFloat(
      valor.replace(/\./g, "").replace(",", ".")
    );
    if (isNaN(valorNum) || valorNum <= 0) {
      alerta("Atenção", "Informe um valor válido.");
      return;
    }
    if (dataVenc.length !== 10) {
      alerta("Atenção", "Data de vencimento inválida. Formato: DD/MM/AAAA");
      return;
    }
    const totalParc = Math.min(Math.max(parseInt(parcelas) || 1, 1), 100);
    const [d, m, y] = dataVenc.split("/");
    const grupoId = gerarIdLocal();
    const items: Omit<Lancamento, "id">[] = [];
    for (let i = 0; i < totalParc; i++) {
      const date = new Date(parseInt(y), parseInt(m) - 1 + i, parseInt(d));
      const mesParc = `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
      const vencParc = `${String(date.getDate()).padStart(2, "0")}/${String(
        date.getMonth() + 1
      ).padStart(2, "0")}/${date.getFullYear()}`;
      items.push({
        descricao: descricao.trim(),
        valor: valorNum,
        natureza,
        parcelaAtual: i + 1,
        totalParcelas: totalParc,
        vencimento: vencParc,
        pago: false,
        mes: mesParc,
        grupoId,
      });
    }
    const mesPrimeiro = items[0].mes;
    // 🆕 Agora espera de verdade o servidor confirmar antes de dizer que deu
    // certo — e mostra um erro de verdade pro usuário se algo falhar,
    // em vez de fingir sucesso silenciosamente.
    try {
      await addLancamentos(items);
      limparForm();
      setMesSelecionado(mesPrimeiro);
      if (totalParc > 1) {
        alerta(
          "Lançamento realizado!",
          `${totalParc} parcelas criadas para os próximos meses.\nExibindo: ${getMesNome(mesPrimeiro)}.`
        );
      }
    } catch (err) {
      alerta(
        "Não foi possível salvar",
        `O lançamento não foi salvo. Tente novamente.\n\nDetalhe: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleExcluir = () => {
    if (!selectedId || !selectedItem) {
      alerta("Atenção", "Clique em uma linha da tabela para selecioná-la e depois clique em EXCLUIR.");
      return;
    }
    alerta(
      "Excluir Item",
      `Deseja excluir o item:\n\n"${selectedItem.descricao}"\nValor: ${formatBRL(selectedItem.valor)}\n\nVai para a Lixeira — você pode restaurar depois.`,
      [
        {
          texto: "Não",
          estilo: "cancelar",
          onPress: () => setAlertaVis(false),
        },
        {
          texto: "Sim",
          estilo: "destrutivo",
          onPress: () => {
            setAlertaVis(false);
            removeLancamento(selectedId);
            setSelectedId(null);
          },
        },
      ]
    );
  };

  // 🆕 Excluir definitivamente — chamado só a partir da tela de Lixeira. Sem volta.
  const handleExcluirDefinitivo = (item: Lancamento) => {
    alerta(
      "Excluir definitivamente?",
      `"${item.descricao}"\nValor: ${formatBRL(item.valor)}\n\nEssa ação NÃO PODE ser desfeita.`,
      [
        { texto: "CANCELAR", estilo: "cancelar", onPress: () => setAlertaVis(false) },
        {
          texto: "SIM, EXCLUIR",
          estilo: "destrutivo",
          onPress: async () => { setAlertaVis(false); await excluirDefinitivo(item.id); },
        },
      ]
    );
  };

  const handleEditar = () => {
    if (!selectedId) {
      alerta("Atenção", "Clique em uma linha da tabela para selecioná-la e depois clique em EDITAR.");
      return;
    }
    setShowEditar(true);
  };

  const gerarPDF = async () => {
    if (sorted.length === 0) {
      alerta("Atenção", "Não há lançamentos para gerar o relatório.");
      return;
    }
    const agora = new Date();
    const rows = sorted
      .map(
        (l, i) => `
      <tr class="${l.natureza === "RECEITA" ? "rec" : "desp"}${i % 2 === 1 ? " alt" : ""}">
        <td>${i + 1}</td>
        ${modoAcumulado ? `<td>${getMesNome(l.mes)}</td>` : ""}
        <td>${l.vencimento}</td>
        <td>${l.descricao}</td>
        <td>${l.natureza}</td>
        <td style="text-align:center">${l.parcelaAtual}/${l.totalParcelas}</td>
        <td style="text-align:right">${formatBRL(l.valor)}</td>
        <td style="text-align:center">${l.pago ? "&#10003;" : "&mdash;"}</td>
      </tr>`
      )
      .join("");

    const periodoLabel = modoAcumulado
      ? `${getMesNome(mesesAcumulados[0])} a ${getMesNome(mesesAcumulados[mesesAcumulados.length - 1])} (${mesesAcumulados.length} meses)`
      : getMesNome(mesSelecionado);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      @page { size: A4; margin: 15mm 12mm; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 0; }
      .header { background: #1A237E; color: #fff; padding: 14px 18px; margin-bottom: 16px; }
      .header h1 { margin: 0; font-size: 18px; }
      .header p  { margin: 4px 0 0; font-size: 11px; opacity: .85; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
      .card { border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; }
      .card-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
      .card-value { font-size: 14px; font-weight: bold; }
      .green { color: #1B5E20; } .red { color: #C62828; } .blue { color: #1A237E; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      thead tr { background: #1A237E; color: #fff; }
      th { padding: 7px 6px; text-align: left; font-size: 10px; letter-spacing: .3px; }
      td { padding: 6px 6px; border-bottom: 1px solid #F0F0F0; }
      tr.rec td { color: #1B5E20; }
      tr.desp td { color: #C62828; }
      tr.alt { background: #FAFAFA; }
      tfoot td { font-weight: bold; background: #EEEEEE; border-top: 2px solid #ccc; }
      .footer { margin-top: 20px; font-size: 10px; color: #999; text-align: center; }
    </style></head><body>
      <div class="header">
        <h1>Relatório de Contas</h1>
        <p>Período: ${periodoLabel} &nbsp;|&nbsp; Gerado em ${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR")}</p>
      </div>

      <div class="summary-grid">
        <div class="card"><div class="card-label">Receita Total</div><div class="card-value green">${formatBRL(totalReceita)}</div></div>
        <div class="card"><div class="card-label">Despesa Total</div><div class="card-value red">${formatBRL(totalDespesa)}</div></div>
        <div class="card"><div class="card-label">Desp. Pagas</div><div class="card-value blue">${formatBRL(vlPago)}</div></div>
        <div class="card"><div class="card-label">Desp. Pendentes</div><div class="card-value red">${formatBRL(vlPendente)}</div></div>
        <div class="card" style="grid-column:span 4"><div class="card-label">Saldo (Receitas − Desp. Pagas)</div><div class="card-value" style="color:${saldo >= 0 ? "#1B5E20" : "#C62828"}">${formatBRL(saldo)}</div></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>${modoAcumulado ? "<th>MÊS</th>" : ""}<th>VENCIMENTO</th><th>DESCRIÇÃO</th>
            <th>NATUREZA</th><th>PARCELA</th><th style="text-align:right">VALOR</th><th style="text-align:center">PAGO</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">App Controle Financeiro</div>
    </body></html>`;
    try {
      if (Platform.OS === "web") {
        const win = window.open("", "_blank");
        if (!win) {
          alerta("Erro", "Permite pop-ups no navegador para gerar o PDF.");
          return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.onload = () => {
          win.focus();
          win.print();
        };
      } else {
        await Print.printAsync({ html });
      }
    } catch (_) {
      alerta("Erro", "Não foi possível gerar o PDF.");
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="dollar-sign" size={20} color="#90CAF9" />
          <Text style={styles.headerTitle}>App Controle Financeiro</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Feather name="log-out" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      {usuarioLogado && (
        <View style={styles.userBar}>
          <Feather name="user" size={12} color="#90CAF9" />
          <Text style={styles.userText}>{usuarioLogado.nomeCompleto}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: botPad + 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.valorLabel}>
            {modoAcumulado
              ? `RECEITA ACUMULADA — ${mesesAcumulados.length} MESES`
              : `VALOR DA RECEITA APROXIMADA PARA ${getMesNome(mesSelecionado)}`}
          </Text>
          {modoAcumulado && (
            <TouchableOpacity onPress={() => setMesesAcumulados([])} style={styles.limparAcumulado}>
              <Feather name="x-circle" size={12} color="#6B7280" />
              <Text style={styles.limparAcumuladoText}>Limpar acumulado</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.valorRow, styles.receitaBorder]}>
            <TextInput
              style={[styles.valorInput, { color: "#1B5E20" }]}
              value={formatBRL(totalReceita)}
              editable={false}
            />
            <TouchableOpacity
              style={styles.lupaBtn}
              onPress={() => setShowLupaReceita(true)}
            >
              <Feather name="search" size={18} color="#1B5E20" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.valorLabel}>
            {modoAcumulado
              ? `DESPESA ACUMULADA — ${mesesAcumulados.length} MESES`
              : `VALOR DA DESPESA APROXIMADA PARA ${getMesNome(mesSelecionado)}`}
          </Text>
          <View style={[styles.valorRow, styles.despesaBorder]}>
            <TextInput
              style={[styles.valorInput, { color: "#C62828" }]}
              value={formatBRL(totalDespesa)}
              editable={false}
            />
            <TouchableOpacity
              style={styles.lupaBtn}
              onPress={() => setShowLupaDespesa(true)}
            >
              <Feather name="search" size={18} color="#C62828" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, styles.formSection]}>
          <TouchableOpacity
            style={styles.formToggle}
            onPress={() => setFormVisible((v) => !v)}
          >
            <Feather
              key={formVisible ? "down" : "right"}
              name={formVisible ? "chevron-down" : "chevron-right"}
              size={20}
              color="#1A237E"
            />
            <Text style={styles.formToggleText}>LANÇAMENTO: (R$)</Text>
          </TouchableOpacity>

          {formVisible && (
            <View style={styles.formBody}>
              <TextInput
                style={styles.input}
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Descrição do lançamento *"
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                value={valor}
                onChangeText={handleValorChange}
                placeholder="Valor R$ *"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.smallLabel}>NATUREZA</Text>
                  <View style={styles.naturezaRow}>
                    <TouchableOpacity
                      style={[
                        styles.natBtn,
                        natureza === "RECEITA" && styles.natReceitaActive,
                      ]}
                      onPress={() => setNatureza("RECEITA")}
                    >
                      <Text
                        style={[
                          styles.natBtnText,
                          natureza === "RECEITA" && styles.natActiveText,
                        ]}
                      >
                        REC
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.natBtn,
                        natureza === "DESPESA" && styles.natDespesaActive,
                      ]}
                      onPress={() => setNatureza("DESPESA")}
                    >
                      <Text
                        style={[
                          styles.natBtnText,
                          natureza === "DESPESA" && styles.natActiveText,
                        ]}
                      >
                        DESP
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ width: 10 }} />
                <View style={{ width: 90 }}>
                  <Text style={styles.smallLabel}>PARCELAS</Text>
                  <TextInput
                    style={styles.input}
                    value={parcelas}
                    onChangeText={(t) =>
                      setParcelas(t.replace(/\D/g, "") || "1")
                    }
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                    maxLength={3}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.smallLabel}>DATA DE VENC. (DD/MM/AAAA)</Text>
                  <TextInput
                    style={styles.input}
                    value={dataVenc}
                    onChangeText={(t) => setDataVenc(maskDate(t))}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={styles.lancarBtns}>
                  <TouchableOpacity
                    style={styles.btnLancar}
                    onPress={handleLancar}
                  >
                    <Text style={styles.btnLancarText}>LANÇAR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnLimpar}
                    onPress={limparForm}
                  >
                    <Text style={styles.btnLancarText}>LIMPAR</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.obrigatorios}>* INFORMAÇÕES OBRIGATÓRIAS</Text>
            </View>
          )}
        </View>

        <View style={[styles.section, { padding: 0 }]}>
          {modoArquivo && (
            <View style={{ backgroundColor: "#EDE7F6", paddingVertical: 5, paddingHorizontal: 10 }}>
              <Text style={{ color: "#6A1B9A", fontSize: 11, fontWeight: "bold", textAlign: "center" }}>
                📦 MODO ARQUIVO — {sortedArquivadosFiltrado.length} item(ns) arquivado(s)
              </Text>
            </View>
          )}
          {modoLixeira && (
            <View style={{ backgroundColor: "#ECEFF1", paddingVertical: 5, paddingHorizontal: 10 }}>
              <Text style={{ color: "#455A64", fontSize: 11, fontWeight: "bold", textAlign: "center" }}>
                🗑 MODO LIXEIRA — {sortedLixeiraFiltrado.length} item(ns) excluído(s) — recuperáveis
              </Text>
            </View>
          )}
          <View style={styles.filtroBarra}>
            <Feather name="search" size={14} color="#1A237E" />
            <TextInput
              style={styles.filtroInput}
              value={filtroTexto}
              onChangeText={setFiltroTexto}
              placeholder="Filtrar por descrição, tipo, data..."
              placeholderTextColor="#9CA3AF"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {filtroTexto.length > 0 && (
              <TouchableOpacity onPress={() => setFiltroTexto("")} style={styles.filtroLimpar}>
                <Feather name="x-circle" size={16} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
          {filtroTexto.length > 0 && (
            <Text style={styles.filtroResultado}>
              {(modoLixeira ? sortedLixeiraFiltrado : modoArquivo ? sortedArquivadosFiltrado : sortedFiltrado).length} resultado(s) para "{filtroTexto}"
            </Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 540 }}>
              <View style={[
                styles.tableHeader,
                modoArquivo && { backgroundColor: "#6A1B9A" },
                modoLixeira && { backgroundColor: "#546E7A" },
              ]}>
                <Text style={[styles.th, { width: 34 }]} numberOfLines={1}>ITEM</Text>
                <Text style={[styles.th, { width: 72, fontSize: 9 }]} numberOfLines={1}>MÊS</Text>
                <Text style={[styles.th, { width: 74 }]} numberOfLines={1}>VENC.</Text>
                <Text style={[styles.th, { flex: 1, minWidth: 130 }]} numberOfLines={1}>DESCRIÇÃO</Text>
                <Text style={[styles.th, { width: 46, fontSize: 9 }]} numberOfLines={1}>TIPO</Text>
                <Text style={[styles.th, { width: 44, fontSize: 9 }]} numberOfLines={1}>PARCELA</Text>
                <Text style={[styles.th, { width: 74 }]} numberOfLines={1}>VL. (R$)</Text>
                <Text style={[styles.th, { width: modoLixeira ? 76 : 46, textAlign: "center", fontSize: 9 }]} numberOfLines={1}>
                  {modoLixeira ? "AÇÕES" : modoArquivo ? "REST." : "PAGO"}
                </Text>
              </View>

              {modoLixeira ? (
                sortedLixeiraFiltrado.length === 0 ? (
                  <View style={styles.emptyTable}>
                    <Text style={styles.emptyTableText}>
                      {filtroTexto.length > 0
                        ? `Nenhum resultado para "${filtroTexto}"`
                        : "Lixeira vazia"}
                    </Text>
                  </View>
                ) : (
                  sortedLixeiraFiltrado.map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.tableRow,
                        index % 2 === 1 && styles.rowEven,
                        { backgroundColor: index % 2 === 0 ? "#ECEFF1" : "#F5F7F8" },
                      ]}
                    >
                      <Text style={[styles.td, { width: 34, color: "#9AA3AF" }]}>{index + 1}</Text>
                      <Text style={[styles.td, { width: 72, fontSize: 10, color: "#9AA3AF" }]} numberOfLines={1}>
                        {getMesNome(item.mes)}
                      </Text>
                      <Text style={[styles.td, { width: 74, fontSize: 11, color: "#9AA3AF" }]}>{item.vencimento}</Text>
                      <Text style={[styles.td, { flex: 1, minWidth: 130, color: "#9AA3AF" }]}>{item.descricao}</Text>
                      <Text style={[styles.td, { width: 46, fontSize: 10, color: "#9AA3AF" }]} numberOfLines={1}>
                        {item.natureza === "RECEITA" ? "REC." : "DESP."}
                      </Text>
                      <Text style={[styles.td, { width: 44, fontSize: 11, textAlign: "center", color: "#9AA3AF" }]}>
                        {item.parcelaAtual}/{item.totalParcelas}
                      </Text>
                      <Text style={[styles.td, { width: 74, fontSize: 11, color: "#9AA3AF" }]}>
                        {formatBRL(item.valor)}
                      </Text>
                      <View style={{ width: 76, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <TouchableOpacity
                          style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: "#E3F2FD", alignItems: "center", justifyContent: "center" }}
                          onPress={() =>
                            alerta(
                              "Restaurar item?",
                              `Deseja restaurar "${item.descricao}" para a lista normal?`,
                              [
                                { texto: "CANCELAR", estilo: "cancelar", onPress: () => setAlertaVis(false) },
                                {
                                  texto: "RESTAURAR",
                                  estilo: "normal",
                                  onPress: async () => { setAlertaVis(false); await restaurar(item.id); },
                                },
                              ]
                            )
                          }
                        >
                          <Feather name="rotate-ccw" size={14} color="#1565C0" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: "#FFEBEE", alignItems: "center", justifyContent: "center" }}
                          onPress={() => handleExcluirDefinitivo(item)}
                        >
                          <Feather name="trash-2" size={14} color="#C62828" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )
              ) : modoArquivo ? (
                sortedArquivadosFiltrado.length === 0 ? (
                  <View style={styles.emptyTable}>
                    <Text style={styles.emptyTableText}>
                      {mesesArquivoAtivos.length === 0
                        ? "Selecione um período no ARQUIVO"
                        : filtroTexto.length > 0
                        ? `Nenhum resultado para "${filtroTexto}"`
                        : "Nenhum item arquivado no período selecionado"}
                    </Text>
                  </View>
                ) : (
                  sortedArquivadosFiltrado.map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.tableRow,
                        index % 2 === 1 && styles.rowEven,
                        { backgroundColor: index % 2 === 0 ? "#FAF5FF" : "#F3E5F5" },
                      ]}
                    >
                      <Text style={[styles.td, { width: 34 }]}>{index + 1}</Text>
                      <Text style={[styles.td, { width: 72, fontSize: 10 }]} numberOfLines={1}>
                        {getMesNome(item.mes)}
                      </Text>
                      <Text style={[styles.td, { width: 74, fontSize: 11 }]}>{item.vencimento}</Text>
                      <Text style={[styles.td, { flex: 1, minWidth: 130 }]}>{item.descricao}</Text>
                      <Text
                        style={[
                          styles.td,
                          { width: 46, fontSize: 10 },
                          item.natureza === "RECEITA" ? styles.receitaText : styles.despesaText,
                        ]}
                        numberOfLines={1}
                      >
                        {item.natureza === "RECEITA" ? "REC." : "DESP."}
                      </Text>
                      <Text style={[styles.td, { width: 44, fontSize: 11, textAlign: "center" }]}>
                        {item.parcelaAtual}/{item.totalParcelas}
                      </Text>
                      <Text style={[styles.td, { width: 74, fontSize: 11 }]}>
                        {formatBRL(item.valor)}
                      </Text>
                      <TouchableOpacity
                        style={{ width: 46, alignItems: "center", justifyContent: "center" }}
                        onPress={() =>
                          alerta(
                            "Restaurar item?",
                            `Deseja restaurar "${item.descricao}" para a lista normal?`,
                            [
                              { texto: "CANCELAR", estilo: "cancelar", onPress: () => setAlertaVis(false) },
                              {
                                texto: "RESTAURAR",
                                estilo: "normal",
                                onPress: async () => { setAlertaVis(false); await restaurar(item.id); },
                              },
                            ]
                          )
                        }
                      >
                        <Feather name="rotate-ccw" size={16} color="#6A1B9A" />
                      </TouchableOpacity>
                    </View>
                  ))
                )
              ) : (
                sortedFiltrado.length === 0 ? (
                  <View style={styles.emptyTable}>
                    <Text style={styles.emptyTableText}>
                      {filtroTexto.length > 0
                        ? `Nenhum resultado para "${filtroTexto}"`
                        : modoAcumulado
                        ? `Nenhum lançamento nos ${mesesAcumulados.length} meses selecionados`
                        : `Nenhum lançamento para ${getMesNome(mesSelecionado)}`}
                    </Text>
                  </View>
                ) : (
                  sortedFiltrado.map((item, index) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setSelectedId(item.id === selectedId ? null : item.id)}
                      style={[
                        styles.tableRow,
                        index % 2 === 1 && styles.rowEven,
                        item.id === selectedId && styles.rowSelected,
                      ]}
                    >
                      <Text style={[styles.td, { width: 34 }]}>{index + 1}</Text>
                      <Text style={[styles.td, { width: 72, fontSize: 10 }]} numberOfLines={1}>
                        {getMesNome(item.mes)}
                      </Text>
                      <Text style={[styles.td, { width: 74, fontSize: 11 }]}>{item.vencimento}</Text>
                      <Text style={[styles.td, { flex: 1, minWidth: 130 }]}>{item.descricao}</Text>
                      <Text
                        style={[
                          styles.td,
                          { width: 46, fontSize: 10 },
                          item.natureza === "RECEITA" ? styles.receitaText : styles.despesaText,
                        ]}
                        numberOfLines={1}
                      >
                        {item.natureza === "RECEITA" ? "REC." : "DESP."}
                      </Text>
                      <Text style={[styles.td, { width: 44, fontSize: 11, textAlign: "center" }]}>
                        {item.parcelaAtual}/{item.totalParcelas}
                      </Text>
                      <Text style={[styles.td, { width: 74, fontSize: 11 }]}>
                        {formatBRL(item.valor)}
                      </Text>
                      <TouchableOpacity
                        style={{ width: 46, alignItems: "center", justifyContent: "center" }}
                        onPress={() => {
                          if (item.pago) {
                            alerta(
                              "Desmarcar pagamento?",
                              "Este item está marcado como pago. Deseja realmente desmarcá-lo?",
                              [
                                { texto: "CANCELAR", estilo: "cancelar", onPress: () => setAlertaVis(false) },
                                {
                                  texto: "SIM, DESMARCAR",
                                  estilo: "destrutivo",
                                  onPress: () => { setAlertaVis(false); togglePago(item.id); },
                                },
                              ]
                            );
                          } else {
                            togglePago(item.id);
                          }
                        }}
                      >
                        <View style={{ alignItems: "center" }}>
                          <View style={{
                            width: 22, height: 22, borderRadius: 4,
                            borderWidth: item.pago ? 0 : 2,
                            borderColor: "#9CA3AF",
                            backgroundColor: item.pago ? "#2E7D32" : "#fff",
                            alignItems: "center", justifyContent: "center",
                          }}>
                            {item.pago && (
                              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold", lineHeight: 18 }}>✓</Text>
                            )}
                          </View>
                          {item.pago && <Feather name="lock" size={9} color="#2E7D32" style={{ marginTop: 1 }} />}
                        </View>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )
              )}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.footerRow}>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>ITENS</Text>
              <TextInput
                style={styles.footerInput}
                value={String(modoLixeira ? sortedLixeiraFiltrado.length : modoArquivo ? sortedArquivadosFiltrado.length : sortedFiltrado.length)}
                editable={false}
              />
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>DESP. PEND.</Text>
              <TextInput
                style={[styles.footerInput, { color: "#C62828" }]}
                value={formatBRL(vlPendente)}
                editable={false}
              />
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>DESP. PAGO</Text>
              <TextInput
                style={[styles.footerInput, { color: "#1565C0" }]}
                value={formatBRL(vlPago)}
                editable={false}
              />
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>SALDO</Text>
              <TextInput
                style={[styles.footerInput, { color: saldo >= 0 ? "#1B5E20" : "#C62828", fontWeight: "bold" }]}
                value={formatBRL(saldo)}
                editable={false}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.btnAzul]} onPress={handleEditar}>
              <Feather name="edit-2" size={13} color="#fff" />
              <Text style={styles.actionBtnText}>EDITAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.btnVermelho]} onPress={handleExcluir}>
              <Feather name="trash-2" size={13} color="#fff" />
              <Text style={styles.actionBtnText}>EXCLUIR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#6A1B9A" }]}
              onPress={() => { setArquivarSelecionados(new Set()); setShowArquivarModal(true); }}
            >
              <Feather name="archive" size={13} color="#fff" />
              <Text style={styles.actionBtnText}>ARQUIVAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnCinza]}
              onPress={limparGeral}
            >
              <Feather name="refresh-ccw" size={13} color="#fff" />
              <Text style={styles.actionBtnText}>LIMPAR GERAL</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnVerde, { flex: 1 }]}
              onPress={() => setShowCadastro(true)}
            >
              <Feather name="users" size={13} color="#fff" />
              <Text style={styles.actionBtnText}>CADASTRO DE USUÁRIO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnVerde, { flex: 1 }]}
              onPress={gerarPDF}
            >
              <Feather name="file-text" size={13} color="#fff" />
              <Text style={styles.actionBtnText}>PDF</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.fluxosRow}
            onPress={() => setFluxosPeriodo((v) => !v)}
          >
            <Feather
              name={fluxosPeriodo ? "check-square" : "square"}
              size={18}
              color="#1A237E"
            />
            <Text style={styles.fluxosText}>FLUXOS & PERÍODO</Text>
          </TouchableOpacity>

          {fluxosPeriodo && (
            <TouchableOpacity
              style={styles.combobox}
              onPress={() => {
                const iniciais = modoAcumulado
                  ? new Set(mesesAcumulados)
                  : new Set([mesSelecionado]);
                setModalSelecionados(iniciais);
                setShowMesModal(true);
              }}
            >
              <Text style={styles.comboboxText} numberOfLines={1}>
                {modoAcumulado
                  ? `${mesesAcumulados.length} meses selecionados`
                  : getMesNome(mesSelecionado)}
              </Text>
              <Feather name="chevron-down" size={16} color="#1A237E" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.fluxosRow, { marginTop: 6 }]}
            onPress={() => {
              setModoArquivo((v) => !v);
              setModoLixeira(false);
              setMesesArquivoAtivos([]);
            }}
          >
            <Feather
              name={modoArquivo ? "check-square" : "square"}
              size={18}
              color="#6A1B9A"
            />
            <Text style={[styles.fluxosText, { color: "#6A1B9A" }]}>ARQUIVO</Text>
            {lancamentosArquivados.length > 0 && (
              <View style={{ backgroundColor: "#6A1B9A", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>{lancamentosArquivados.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fluxosRow, { marginTop: 6 }]}
            onPress={() => {
              setModoLixeira((v) => !v);
              setModoArquivo(false);
            }}
          >
            <Feather
              name={modoLixeira ? "check-square" : "square"}
              size={18}
              color="#546E7A"
            />
            <Text style={[styles.fluxosText, { color: "#546E7A" }]}>🗑 LIXEIRA</Text>
            {lancamentosLixeira.length > 0 && (
              <View style={{ backgroundColor: "#546E7A", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>{lancamentosLixeira.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          {modoArquivo && (
            <TouchableOpacity
              style={[styles.combobox, { borderColor: "#6A1B9A", backgroundColor: "#F3E5F5" }]}
              onPress={() => {
                setModalArquivoMeses(new Set(mesesArquivoAtivos));
                setShowArquivoMesModal(true);
              }}
            >
              <Text style={[styles.comboboxText, { color: "#6A1B9A" }]} numberOfLines={1}>
                {mesesArquivoAtivos.length > 0
                  ? `${mesesArquivoAtivos.length} mês(es) selecionado(s)`
                  : "Selecionar meses arquivados"}
              </Text>
              <Feather name="chevron-down" size={16} color="#6A1B9A" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showMesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMesModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMesModal(false)}
        >
          <View style={styles.mesModalContainer}>
            {/* Título + Selecionar Todos */}
            <View style={styles.mesModalHeader}>
              <Text style={styles.mesModalTitle}>Selecionar Período</Text>
              {mesesDisponiveis.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    const todosJaSelecionados =
                      modalSelecionados.size === mesesDisponiveis.length;
                    setModalSelecionados(
                      todosJaSelecionados
                        ? new Set()
                        : new Set(mesesDisponiveis)
                    );
                  }}
                >
                  <Text style={styles.mesModalTodos}>
                    {modalSelecionados.size === mesesDisponiveis.length
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {mesesDisponiveis.length === 0 ? (
              <Text style={styles.emptyTableText}>Nenhum período disponível</Text>
            ) : (
              <FlatList
                data={mesesDisponiveis}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  const marcado = modalSelecionados.has(item);
                  return (
                    <TouchableOpacity
                      style={[styles.mesItem, marcado && styles.mesItemSelected]}
                      onPress={() => {
                        setModalSelecionados((prev) => {
                          const next = new Set(prev);
                          if (next.has(item)) next.delete(item);
                          else next.add(item);
                          return next;
                        });
                      }}
                    >
                      <View style={{
                        width: 22,
                        height: 22,
                        borderRadius: 4,
                        borderWidth: marcado ? 0 : 2,
                        borderColor: "#9CA3AF",
                        backgroundColor: marcado ? "#fff" : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}>
                        {marcado && (
                          <Text style={{ color: "#1A237E", fontSize: 14, fontWeight: "bold", lineHeight: 18 }}>✓</Text>
                        )}
                      </View>
                      <Text style={[
                        styles.mesItemText,
                        marcado && styles.mesItemSelectedText,
                      ]}>
                        {getMesNome(item)}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Botão confirmar */}
            {modalSelecionados.size > 0 && (
              <TouchableOpacity
                style={styles.mesModalConfirmar}
                onPress={() => {
                  const lista = Array.from(modalSelecionados).sort((a, b) => {
                    const [ma, ya] = a.split("/");
                    const [mb, yb] = b.split("/");
                    return new Date(+ya, +ma - 1).getTime() - new Date(+yb, +mb - 1).getTime();
                  });
                  if (lista.length === 1) {
                    setMesesAcumulados([]);
                    setMesSelecionado(lista[0]);
                  } else {
                    setMesesAcumulados(lista);
                    setMesSelecionado(lista[0]);
                  }
                  setShowMesModal(false);
                }}
              >
                <Feather name={modalSelecionados.size > 1 ? "layers" : "check"} size={15} color="#fff" />
                <Text style={styles.mesModalConfirmarTexto}>
                  {modalSelecionados.size > 1
                    ? `CARREGAR ${modalSelecionados.size} MESES`
                    : "CONFIRMAR"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <LupaModal
        visible={showLupaReceita}
        tipo="RECEITA"
        onClose={() => setShowLupaReceita(false)}
        onSelecionarMes={(mes) => {
          setMesesAcumulados([]);
          setMesSelecionado(mes);
          setFluxosPeriodo(true);
        }}
        onAcumular={(meses) => {
          setMesesAcumulados(meses);
          setMesSelecionado(meses[0]);
          setFluxosPeriodo(true);
        }}
      />
      <LupaModal
        visible={showLupaDespesa}
        tipo="DESPESA"
        onClose={() => setShowLupaDespesa(false)}
        onSelecionarMes={(mes) => {
          setMesesAcumulados([]);
          setMesSelecionado(mes);
          setFluxosPeriodo(true);
        }}
        onAcumular={(meses) => {
          setMesesAcumulados(meses);
          setMesSelecionado(meses[0]);
          setFluxosPeriodo(true);
        }}
      />
      <CadastroUsuariosModal
        visible={showCadastro}
        onClose={() => setShowCadastro(false)}
      />
      <EditarModal
        visible={showEditar}
        lancamento={selectedItem}
        onClose={() => {
          setShowEditar(false);
          setSelectedId(null);
        }}
      />
      {/* Modal — Selecionar itens para arquivar */}
      <Modal
        visible={showArquivarModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowArquivarModal(false); setFiltroArquivar(""); }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setShowArquivarModal(false); setFiltroArquivar(""); }}
        >
          <View style={[styles.mesModalContainer, { width: "92%", maxHeight: 540 }]}>
            <View style={styles.mesModalHeader}>
              <Text style={[styles.mesModalTitle, { color: "#6A1B9A" }]}>Selecionar para Arquivar</Text>
              {todosNaoArquivadosFiltrados.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    const todos = new Set(todosNaoArquivadosFiltrados.map((l) => l.id));
                    const todosJa = todosNaoArquivadosFiltrados.every((l) => arquivarSelecionados.has(l.id));
                    setArquivarSelecionados((prev) => {
                      const next = new Set(prev);
                      if (todosJa) { todosNaoArquivadosFiltrados.forEach((l) => next.delete(l.id)); }
                      else { todos.forEach((id) => next.add(id)); }
                      return next;
                    });
                  }}
                >
                  <Text style={[styles.mesModalTodos, { color: "#6A1B9A" }]}>
                    {todosNaoArquivadosFiltrados.every((l) => arquivarSelecionados.has(l.id)) ? "Desmarcar todos" : "Selecionar todos"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={[styles.filtroBarra, { backgroundColor: "#F3E8FF", borderBottomColor: "#D8B4FE" }]}>
                <Feather name="search" size={15} color="#6A1B9A" />
                <TextInput
                  style={[styles.filtroInput, { color: "#6A1B9A" }]}
                  placeholder="Buscar lançamento..."
                  placeholderTextColor="#A78BFA"
                  value={filtroArquivar}
                  onChangeText={setFiltroArquivar}
                />
                {filtroArquivar.length > 0 && (
                  <TouchableOpacity onPress={() => setFiltroArquivar("")} style={styles.filtroLimpar}>
                    <Feather name="x" size={15} color="#6A1B9A" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
            {filtroArquivar.length > 0 && (
              <Text style={[styles.filtroResultado, { backgroundColor: "#FAF5FF", borderBottomColor: "#E9D5FF" }]}>
                {todosNaoArquivadosFiltrados.length} resultado(s) encontrado(s)
              </Text>
            )}
            {todosNaoArquivados.length === 0 ? (
              <Text style={styles.emptyTableText}>Nenhum lançamento disponível para arquivar</Text>
            ) : todosNaoArquivadosFiltrados.length === 0 ? (
              <Text style={styles.emptyTableText}>Nenhum resultado para "{filtroArquivar}"</Text>
            ) : (
              <FlatList
                data={todosNaoArquivadosFiltrados}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const sel = arquivarSelecionados.has(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.mesItem, sel && { backgroundColor: "#6A1B9A" }]}
                      onPress={() => {
                        setArquivarSelecionados((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                      }}
                    >
                      <View style={{
                        width: 22, height: 22, borderRadius: 4,
                        borderWidth: sel ? 0 : 2, borderColor: "#9CA3AF",
                        backgroundColor: sel ? "#fff" : "transparent",
                        alignItems: "center", justifyContent: "center", marginRight: 10,
                      }}>
                        {sel && <Text style={{ color: "#6A1B9A", fontSize: 14, fontWeight: "bold", lineHeight: 18 }}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontSize: 13, fontWeight: "600" }, sel && { color: "#fff" }]} numberOfLines={1}>
                          {item.descricao}
                        </Text>
                        <Text style={[{ fontSize: 11, color: "#6B7280" }, sel && { color: "#E9D5FF" }]}>
                          {getMesNome(item.mes)} · {item.natureza === "RECEITA" ? "REC." : "DESP."} · {formatBRL(item.valor)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            {arquivarSelecionados.size > 0 && (
              <TouchableOpacity
                style={[styles.mesModalConfirmar, { backgroundColor: "#6A1B9A" }]}
                onPress={handleArquivar}
              >
                <Feather name="archive" size={15} color="#fff" />
                <Text style={styles.mesModalConfirmarTexto}>
                  ARQUIVAR {arquivarSelecionados.size} ITEM(NS)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal — Selecionar meses do arquivo */}
      <Modal
        visible={showArquivoMesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowArquivoMesModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowArquivoMesModal(false)}
        >
          <View style={styles.mesModalContainer}>
            <View style={styles.mesModalHeader}>
              <Text style={[styles.mesModalTitle, { color: "#6A1B9A" }]}>Período do Arquivo</Text>
              {mesesArquivados.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    const todosJa = modalArquivoMeses.size === mesesArquivados.length;
                    setModalArquivoMeses(todosJa ? new Set() : new Set(mesesArquivados));
                  }}
                >
                  <Text style={[styles.mesModalTodos, { color: "#6A1B9A" }]}>
                    {modalArquivoMeses.size === mesesArquivados.length ? "Desmarcar todos" : "Selecionar todos"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {mesesArquivados.length === 0 ? (
              <Text style={styles.emptyTableText}>Nenhum mês com itens arquivados</Text>
            ) : (
              <FlatList
                data={mesesArquivados}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  const marcado = modalArquivoMeses.has(item);
                  return (
                    <TouchableOpacity
                      style={[styles.mesItem, marcado && { backgroundColor: "#6A1B9A" }]}
                      onPress={() => {
                        setModalArquivoMeses((prev) => {
                          const next = new Set(prev);
                          if (next.has(item)) next.delete(item);
                          else next.add(item);
                          return next;
                        });
                      }}
                    >
                      <View style={{
                        width: 22, height: 22, borderRadius: 4,
                        borderWidth: marcado ? 0 : 2, borderColor: "#9CA3AF",
                        backgroundColor: marcado ? "#fff" : "transparent",
                        alignItems: "center", justifyContent: "center", marginRight: 10,
                      }}>
                        {marcado && <Text style={{ color: "#6A1B9A", fontSize: 14, fontWeight: "bold", lineHeight: 18 }}>✓</Text>}
                      </View>
                      <Text style={[styles.mesItemText, marcado && { color: "#fff", fontWeight: "bold" }]}>
                        {getMesNome(item)}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            {modalArquivoMeses.size > 0 && (
              <TouchableOpacity
                style={[styles.mesModalConfirmar, { backgroundColor: "#6A1B9A" }]}
                onPress={() => {
                  const lista = Array.from(modalArquivoMeses).sort((a, b) => {
                    const [ma, ya] = a.split("/");
                    const [mb, yb] = b.split("/");
                    return new Date(+ya, +ma - 1).getTime() - new Date(+yb, +mb - 1).getTime();
                  });
                  setMesesArquivoAtivos(lista);
                  setShowArquivoMesModal(false);
                }}
              >
                <Feather name="check" size={15} color="#fff" />
                <Text style={styles.mesModalConfirmarTexto}>
                  {modalArquivoMeses.size > 1 ? `VER ${modalArquivoMeses.size} MESES` : "CONFIRMAR"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <AlertaModal
        visible={alertaVis}
        titulo={alertaTitulo}
        mensagem={alertaMsg}
        botoes={alertaBotoes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    backgroundColor: "#1A237E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  logoutBtn: { padding: 4 },
  userBar: {
    backgroundColor: "#283593",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 3,
    gap: 4,
  },
  userText: {
    color: "#90CAF9",
    fontSize: 11,
  },
  scroll: { flex: 1 },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  formSection: {
    borderColor: "#94A3B8",
  },
  valorLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  valorRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 6,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 2,
  },
  receitaBorder: { borderColor: "#4CAF50" },
  despesaBorder: { borderColor: "#EF5350" },
  valorInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 6,
  },
  lupaBtn: {
    padding: 8,
  },
  formToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 2,
  },
  formToggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A237E",
    textTransform: "uppercase",
  },
  formBody: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 5,
    padding: 8,
    fontSize: 13,
    color: "#111827",
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  formRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  smallLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  naturezaRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
  },
  natBtn: {
    flex: 1,
    padding: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  natReceitaActive: { backgroundColor: "#1B5E20", borderColor: "#1B5E20" },
  natDespesaActive: { backgroundColor: "#C62828", borderColor: "#C62828" },
  natBtnText: { fontSize: 11, fontWeight: "700", color: "#374151" },
  natActiveText: { color: "#fff" },
  lancarBtns: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 8,
  },
  btnLancar: {
    backgroundColor: "#2E7D32",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
  },
  btnLimpar: {
    backgroundColor: "#1565C0",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
  },
  btnLancarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  obrigatorios: {
    fontSize: 9,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1A237E",
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  th: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#fff",
  },
  rowEven: { backgroundColor: "#F9FAFB" },
  rowSelected: { backgroundColor: "#DBEAFE" },
  td: {
    fontSize: 12,
    color: "#111827",
    paddingHorizontal: 2,
  },
  receitaText: { color: "#1B5E20", fontWeight: "600" },
  despesaText: { color: "#C62828", fontWeight: "600" },
  filtroBarra: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderBottomWidth: 1,
    borderBottomColor: "#C7D2FE",
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  filtroInput: {
    flex: 1,
    fontSize: 13,
    color: "#1A237E",
    paddingVertical: 2,
  },
  filtroLimpar: {
    padding: 2,
  },
  filtroResultado: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 3,
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  emptyTable: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyTableText: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  footerRow: {
    flexDirection: "row",
    gap: 6,
  },
  footerItem: { flex: 1 },
  footerLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 3,
    textTransform: "uppercase",
    textAlign: "center",
  },
  footerInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 4,
    padding: 5,
    fontSize: 11,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    backgroundColor: "#F9FAFB",
  },
  actionRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    paddingVertical: 9,
    gap: 4,
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 11,
  },
  btnVerde: { backgroundColor: "#2E7D32" },
  btnAzul: { backgroundColor: "#1565C0" },
  btnVermelho: { backgroundColor: "#C62828" },
  btnCinza: { backgroundColor: "#546E7A" },
  fluxosRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  fluxosText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A237E",
  },
  combobox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#1A237E",
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
    backgroundColor: "#EFF6FF",
  },
  comboboxText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A237E",
  },
  limparAcumulado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 4,
  },
  limparAcumuladoText: {
    fontSize: 10,
    color: "#6B7280",
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  mesModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    width: "80%",
    maxHeight: 380,
  },
  mesModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  mesModalTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1A237E",
  },
  mesModalTodos: {
    fontSize: 12,
    color: "#1565C0",
    textDecorationLine: "underline",
  },
  mesItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  mesItemSelected: { backgroundColor: "#1A237E" },
  mesItemText: { fontSize: 14, color: "#111827", flex: 1 },
  mesItemSelectedText: { color: "#fff", fontWeight: "bold" },
  mesModalConfirmar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A237E",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 10,
  },
  mesModalConfirmarTexto: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
});
