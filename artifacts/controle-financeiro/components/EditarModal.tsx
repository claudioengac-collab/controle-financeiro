import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
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


interface Props {
  visible: boolean;
  lancamento: Lancamento | null;
  onClose: () => void;
}

function maskDate(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function EditarModal({ visible, lancamento, onClose }: Props) {
  const { updateLancamento } = useApp();
  const insets = useSafeAreaInsets();

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [natureza, setNatureza] = useState<Natureza>("DESPESA");
  const [parcelas, setParcelas] = useState("1");
  const [dataVenc, setDataVenc] = useState("");
  const [alertaVis, setAlertaVis] = useState(false);
  const [alertaTitulo, setAlertaTitulo] = useState("");
  const [alertaMsg, setAlertaMsg] = useState("");
  type ABotao = { texto: string; estilo?: "normal" | "destrutivo" | "cancelar"; onPress: () => void };
  const [alertaBotoes, setAlertaBotoes] = useState<ABotao[]>([]);

  const alerta = (titulo: string, msg?: string, botoes?: ABotao[]) => {
    setAlertaTitulo(titulo);
    setAlertaMsg(msg ?? "");
    setAlertaBotoes(botoes ?? [{ texto: "OK", estilo: "normal", onPress: () => setAlertaVis(false) }]);
    setAlertaVis(true);
  };

  useEffect(() => {
    if (lancamento) {
      setDescricao(lancamento.descricao);
      setValor(lancamento.valor.toFixed(2).replace(".", ","));
      setNatureza(lancamento.natureza);
      setParcelas(String(lancamento.totalParcelas));
      setDataVenc(lancamento.vencimento);
    }
  }, [lancamento]);

  const handleSalvar = async () => {
    if (!descricao.trim()) {
      alerta("Atenção", "Informe a descrição.");
      return;
    }
    const valorNum = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (isNaN(valorNum) || valorNum <= 0) {
      alerta("Atenção", "Informe um valor válido.");
      return;
    }
    if (dataVenc.length !== 10) {
      alerta("Atenção", "Data de vencimento inválida (DD/MM/AAAA).");
      return;
    }
    if (!lancamento) return;
    const [, mesVenc, anoVenc] = dataVenc.split("/");
    const novoMes = `${mesVenc}/${anoVenc}`;
    await updateLancamento(lancamento.id, {
      descricao: descricao.trim(),
      valor: valorNum,
      natureza,
      totalParcelas: parseInt(parcelas) || 1,
      vencimento: dataVenc,
      mes: novoMes,
    });
    alerta("Sucesso", "Edição realizada com sucesso!", [
      { texto: "OK", estilo: "normal", onPress: () => { setAlertaVis(false); onClose(); } },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            styles.container,
            { paddingTop: Platform.OS === "web" ? 67 : insets.top },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Editar Lançamento</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Text style={styles.label}>Descrição *</Text>
              <TextInput
                style={styles.input}
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Descrição do lançamento"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>Valor (R$) *</Text>
              <TextInput
                style={styles.input}
                value={valor}
                onChangeText={(t) => {
                  const digits = t.replace(/\D/g, "");
                  const num = parseInt(digits || "0") / 100;
                  setValor(
                    num.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  );
                }}
                placeholder="0,00"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Natureza *</Text>
              <View style={styles.naturezaRow}>
                <TouchableOpacity
                  style={[
                    styles.naturezaBtn,
                    natureza === "RECEITA" && styles.naturezaReceitaActive,
                  ]}
                  onPress={() => setNatureza("RECEITA")}
                >
                  <Text
                    style={[
                      styles.naturezaBtnText,
                      natureza === "RECEITA" && styles.naturezaActiveTxt,
                    ]}
                  >
                    RECEITA
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.naturezaBtn,
                    natureza === "DESPESA" && styles.naturezaDespesaActive,
                  ]}
                  onPress={() => setNatureza("DESPESA")}
                >
                  <Text
                    style={[
                      styles.naturezaBtnText,
                      natureza === "DESPESA" && styles.naturezaActiveTxt,
                    ]}
                  >
                    DESPESA
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Total Parcelas</Text>
                  <TextInput
                    style={styles.input}
                    value={parcelas}
                    onChangeText={(t) => setParcelas(t.replace(/\D/g, "") || "1")}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>Data de Vencimento * (DD/MM/AAAA)</Text>
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
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btn, styles.btnSalvar]} onPress={handleSalvar}>
                  <Text style={styles.btnText}>SALVAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnCancelar]} onPress={onClose}>
                  <Text style={styles.btnText}>CANCELAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
          <AlertaModal
            visible={alertaVis}
            titulo={alertaTitulo}
            mensagem={alertaMsg}
            botoes={alertaBotoes}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    backgroundColor: "#1A237E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  closeBtn: { padding: 4 },
  content: { flex: 1, padding: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: "#111827",
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  naturezaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  naturezaBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  naturezaReceitaActive: {
    backgroundColor: "#1B5E20",
    borderColor: "#1B5E20",
  },
  naturezaDespesaActive: {
    backgroundColor: "#C62828",
    borderColor: "#C62828",
  },
  naturezaBtnText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  naturezaActiveTxt: { color: "#fff" },
  row: { flexDirection: "row" },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  btnSalvar: { backgroundColor: "#2E7D32" },
  btnCancelar: { backgroundColor: "#6B7280" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});
