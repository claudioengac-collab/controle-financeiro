import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Botao {
  texto: string;
  estilo?: "normal" | "destrutivo" | "cancelar";
  onPress: () => void;
}

interface Props {
  visible: boolean;
  titulo: string;
  mensagem?: string;
  botoes: Botao[];
}

export function AlertaModal({ visible, titulo, mensagem, botoes }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.caixa}>
          <Text style={styles.titulo}>{titulo}</Text>
          {mensagem ? <Text style={styles.mensagem}>{mensagem}</Text> : null}
          <View style={[styles.botoesRow, botoes.length === 1 && { justifyContent: "center" }]}>
            {botoes.map((b, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.btn,
                  b.estilo === "destrutivo" && styles.btnDestrutivo,
                  b.estilo === "cancelar" && styles.btnCancelar,
                  b.estilo === "normal" && styles.btnNormal,
                  !b.estilo && styles.btnNormal,
                ]}
                onPress={b.onPress}
              >
                <Text
                  style={[
                    styles.btnText,
                    (b.estilo === "destrutivo" || b.estilo === "normal" || !b.estilo) &&
                      styles.btnTextBranco,
                    b.estilo === "cancelar" && styles.btnTextCinza,
                  ]}
                >
                  {b.texto}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  caixa: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 22,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  titulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A237E",
    textAlign: "center",
    marginBottom: 8,
  },
  mensagem: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
  },
  botoesRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },
  btnNormal: {
    backgroundColor: "#1A237E",
  },
  btnDestrutivo: {
    backgroundColor: "#C62828",
  },
  btnCancelar: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  btnText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  btnTextBranco: {
    color: "#fff",
  },
  btnTextCinza: {
    color: "#374151",
  },
});
