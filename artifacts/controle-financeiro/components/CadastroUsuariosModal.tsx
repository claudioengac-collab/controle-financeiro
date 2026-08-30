import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
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
import { useApp } from "@/context/AppContext";
import { AlertaModal } from "@/components/AlertaModal";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CadastroUsuariosModal({ visible, onClose }: Props) {
  const { usuarios, addUsuario, removeUsuario } = useApp();
  const insets = useSafeAreaInsets();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
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

  const limpar = () => {
    setNome("");
    setEmail("");
    setSenha("");
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      alerta("Atenção", "Informe o nome completo.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      alerta("Atenção", "Informe um e-mail válido.");
      return;
    }
    if (!senha || senha.length < 4) {
      alerta("Atenção", "Senha deve ter no mínimo 4 caracteres.");
      return;
    }
    setCarregando(true);
    await addUsuario(nome, senha, email);
    setCarregando(false);
    alerta("Sucesso", "Usuário cadastrado com sucesso!");
    limpar();
  };

  const handleExcluir = (id: string, nomeUsuario: string) => {
    alerta(
      "Excluir Usuário",
      `Deseja excluir o usuário "${nomeUsuario}"?`,
      [
        { texto: "Não", estilo: "cancelar", onPress: () => setAlertaVis(false) },
        { texto: "Sim", estilo: "destrutivo", onPress: () => { setAlertaVis(false); removeUsuario(id); } },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          { paddingTop: Platform.OS === "web" ? 67 : insets.top },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cadastro de Usuários</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Novo Usuário</Text>
            <Text style={styles.label}>Nome Completo *</Text>
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={setNome}
              placeholder="Nome completo"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />
            <Text style={styles.label}>E-mail *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="exemplo@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.label}>Senha *</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={senha}
                onChangeText={setSenha}
                placeholder="Mínimo 4 caracteres"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!mostrarSenha}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setMostrarSenha((v) => !v)}
              >
                <Feather
                  name={mostrarSenha ? "eye-off" : "eye"}
                  size={18}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSalvar, carregando && styles.btnDisabled]}
                onPress={handleSalvar}
                disabled={carregando}
              >
                <Text style={styles.btnText}>
                  {carregando ? "SALVANDO..." : "SALVAR"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnLimpar]}
                onPress={limpar}
              >
                <Text style={styles.btnText}>LIMPAR</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.listaCard}>
            <Text style={styles.sectionTitle}>
              Usuários Cadastrados ({usuarios.length})
            </Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { flex: 1 }]}>Nome</Text>
              <Text style={[styles.thText, { flex: 1 }]}>E-mail</Text>
              <Text style={[styles.thText, { width: 40 }]}></Text>
            </View>
            {usuarios.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum usuário cadastrado.</Text>
            ) : (
              <FlatList
                data={usuarios}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item, index }) => (
                  <View
                    style={[
                      styles.tableRow,
                      index % 2 === 1 && styles.rowEven,
                    ]}
                  >
                    <Text style={[styles.tdText, { flex: 1 }]} numberOfLines={1}>
                      {item.nomeCompleto}
                    </Text>
                    <Text style={[styles.tdText, { flex: 1 }]} numberOfLines={1}>
                      {item.email || "—"}
                    </Text>
                    <TouchableOpacity
                      style={{ width: 40, alignItems: "center" }}
                      onPress={() => handleExcluir(item.id, item.nomeCompleto)}
                    >
                      <Feather name="trash-2" size={16} color="#C62828" />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </ScrollView>
        <AlertaModal
          visible={alertaVis}
          titulo={alertaTitulo}
          mensagem={alertaMsg}
          botoes={alertaBotoes}
        />
      </View>
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
  closeBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  listaCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1A237E",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    padding: 9,
    fontSize: 14,
    color: "#111827",
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  eyeBtn: {
    padding: 9,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    backgroundColor: "#F9FAFB",
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
  },
  btnSalvar: {
    backgroundColor: "#2E7D32",
  },
  btnLimpar: {
    backgroundColor: "#1565C0",
  },
  btnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1A237E",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  thText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowEven: {
    backgroundColor: "#F9FAFB",
  },
  tdText: {
    fontSize: 13,
    color: "#111827",
  },
  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
    paddingVertical: 20,
  },
});
