import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
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

export function LoginScreen() {
  const { login, addUsuario, usuarios, carregando: carregandoDados } = useApp();
  const insets = useSafeAreaInsets();

  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [modoRegistro, setModoRegistro] = useState(false);
  const [nomeReg, setNomeReg] = useState("");
  const [emailReg, setEmailReg] = useState("");
  const [senhaReg, setSenhaReg] = useState("");
  const [senhaConf, setSenhaConf] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [alertaVis, setAlertaVis] = useState(false);
  const [alertaTitulo, setAlertaTitulo] = useState("");
  const [alertaMsg, setAlertaMsg] = useState("");
  const [alertaOnOk, setAlertaOnOk] = useState<(() => void) | null>(null);

  const primeiroAcesso = usuarios.length === 0;

  const alerta = (titulo: string, msg: string, onOk?: () => void) => {
    setAlertaTitulo(titulo);
    setAlertaMsg(msg);
    setAlertaOnOk(onOk ? () => onOk : null);
    setAlertaVis(true);
  };

  const fecharAlerta = () => {
    setAlertaVis(false);
    if (alertaOnOk) {
      alertaOnOk();
      setAlertaOnOk(null);
    }
  };

  const handleLogin = async () => {
    if (!nome.trim() || !senha) {
      alerta("Atenção", "Preencha o nome e a senha.");
      return;
    }
    setCarregando(true);
    try {
      const ok = await login(nome, senha);
      if (!ok) {
        alerta("Erro", "Nome ou senha inválidos.");
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleRegistrar = async () => {
    if (!nomeReg.trim()) {
      alerta("Atenção", "Informe o nome completo.");
      return;
    }
    if (!emailReg.trim() || !emailReg.includes("@")) {
      alerta("Atenção", "Informe um e-mail válido.");
      return;
    }
    if (senhaReg.length < 4) {
      alerta("Atenção", "A senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (senhaReg !== senhaConf) {
      alerta("Atenção", "As senhas não coincidem.");
      return;
    }
    setCarregando(true);
    try {
      await addUsuario(nomeReg, senhaReg, emailReg);
      if (primeiroAcesso) {
        alerta("Sucesso", "Usuário criado! Faça o login.", () => {
          setNome(nomeReg);
          setModoRegistro(false);
          setNomeReg("");
          setEmailReg("");
          setSenhaReg("");
          setSenhaConf("");
        });
      } else {
        alerta("Sucesso", "Usuário cadastrado com sucesso!");
        setModoRegistro(false);
        setNomeReg("");
        setEmailReg("");
        setSenhaReg("");
        setSenhaConf("");
      }
    } catch (err) {
      const mensagem =
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível cadastrar o usuário.";
      alerta("Não foi possível cadastrar", mensagem);
    } finally {
      setCarregando(false);
    }
  };

  if (carregandoDados) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1A237E", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
          App Controle Financeiro
        </Text>
        <Text style={{ color: "#90CAF9", fontSize: 14 }}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerBox}>
          <Feather name="dollar-sign" size={40} color="#fff" />
          <Text style={styles.titulo}>App Controle</Text>
          <Text style={styles.subtitulo}>Financeiro</Text>
        </View>

        <View style={styles.card}>
          {!modoRegistro && !primeiroAcesso ? (
            <>
              <Text style={styles.cardTitulo}>Entrar</Text>
              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                style={styles.input}
                value={nome}
                onChangeText={setNome}
                placeholder="Seu nome"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={senha}
                  onChangeText={setSenha}
                  placeholder="Sua senha"
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
              <TouchableOpacity
                style={[styles.btnLogin, carregando && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={carregando}
              >
                <Text style={styles.btnLoginText}>{carregando ? "ENTRANDO..." : "ENTRAR"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitulo}>
                {primeiroAcesso ? "Primeiro Acesso" : "Novo Usuário"}
              </Text>
              {primeiroAcesso && (
                <Text style={styles.infoText}>
                  Nenhum usuário cadastrado. Crie o primeiro acesso.
                </Text>
              )}
              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                style={styles.input}
                value={nomeReg}
                onChangeText={setNomeReg}
                placeholder="Nome completo"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                value={emailReg}
                onChangeText={setEmailReg}
                placeholder="exemplo@email.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                value={senhaReg}
                onChangeText={setSenhaReg}
                placeholder="Mínimo 4 caracteres"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
              <Text style={styles.label}>Confirmar Senha</Text>
              <TextInput
                style={styles.input}
                value={senhaConf}
                onChangeText={setSenhaConf}
                placeholder="Repita a senha"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.btnLogin, carregando && styles.btnDisabled]}
                onPress={handleRegistrar}
                disabled={carregando}
              >
                <Text style={styles.btnLoginText}>
                  {carregando ? "SALVANDO..." : "CADASTRAR"}
                </Text>
              </TouchableOpacity>
              {!primeiroAcesso && (
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => setModoRegistro(false)}
                >
                  <Text style={styles.linkText}>Voltar ao Login</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {!primeiroAcesso && !modoRegistro && (
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => setModoRegistro(true)}
            >
              <Text style={styles.linkText}>Cadastrar novo usuário</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    <AlertaModal
      visible={alertaVis}
      titulo={alertaTitulo}
      mensagem={alertaMsg}
      botoes={[{ texto: "OK", estilo: "normal", onPress: fecharAlerta }]}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#1A237E",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  headerBox: {
    alignItems: "center",
    marginBottom: 30,
  },
  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },
  subtitulo: {
    fontSize: 20,
    color: "#90CAF9",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  cardTitulo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A237E",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    padding: 10,
    fontSize: 15,
    color: "#111827",
    marginBottom: 14,
    backgroundColor: "#F9FAFB",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  eyeBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    backgroundColor: "#F9FAFB",
  },
  btnLogin: {
    backgroundColor: "#1A237E",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  btnLoginText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  linkBtn: {
    marginTop: 14,
    alignItems: "center",
  },
  linkText: {
    color: "#1565C0",
    fontSize: 14,
    fontWeight: "500",
  },
  infoText: {
    color: "#6B7280",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 14,
  },
});
