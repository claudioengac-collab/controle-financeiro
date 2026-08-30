import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface Props {
  value: string;
  onChange: (data: string) => void;
  minDate?: Date;
}

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function parseDataBR(str: string): Date | null {
  if (!str || str.length < 10) return null;
  const [d, m, y] = str.split("/");
  if (!d || !m || !y) return null;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}

function formatDateBR(date: Date): string {
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear(),
  ].join("/");
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a) === startOfDay(b);
}

// ─── Calendário Web — usa Modal do RN para ficar acima de tudo ───────────────
function CalendarioWeb({ value, onChange, minDate }: Props) {
  const hoje = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    : null;
  const dataSel = parseDataBR(value);

  const agora = new Date();
  const [aberto, setAberto] = useState(false);
  const [mes, setMes] = useState(() => (dataSel ?? agora).getMonth());
  const [ano, setAno] = useState(() => (dataSel ?? agora).getFullYear());

  const abrir = () => {
    const base = dataSel ?? agora;
    setMes(base.getMonth());
    setAno(base.getFullYear());
    setAberto(true);
  };

  const fechar = () => setAberto(false);

  const anterior = () => {
    if (mes === 0) { setMes(11); setAno((a) => a - 1); }
    else setMes((m) => m - 1);
  };

  const proximo = () => {
    if (mes === 11) { setMes(0); setAno((a) => a + 1); }
    else setMes((m) => m + 1);
  };

  const celulas = (): (number | null)[] => {
    const primeiro = new Date(ano, mes, 1).getDay();
    const total = new Date(ano, mes + 1, 0).getDate();
    const arr: (number | null)[] = Array(primeiro).fill(null);
    for (let d = 1; d <= total; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  };

  const selecionar = (d: number) => {
    const data = new Date(ano, mes, d);
    if (hoje && data.getTime() < hoje.getTime()) return;
    onChange(formatDateBR(data));
    fechar();
  };

  // Largura de cada célula: 1/7 do card (280px max)
  const CELL = 40;

  return (
    <>
      {/* Campo disparador */}
      <TouchableOpacity onPress={abrir} style={styles.campo}>
        <Feather name="calendar" size={16} color="#1A237E" />
        <Text style={[styles.campoTexto, !value && styles.placeholder]}>
          {value || "Selecionar data"}
        </Text>
        <Feather name="chevron-down" size={14} color="#6B7280" />
      </TouchableOpacity>

      {/* Modal centralizado — fica acima de toda a hierarquia */}
      <Modal
        visible={aberto}
        transparent
        animationType="fade"
        onRequestClose={fechar}
      >
        <TouchableWithoutFeedback onPress={fechar}>
          <View style={styles.calOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.calCard}>
            {/* Cabeçalho mês/ano */}
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={anterior} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calHeaderTitulo}>
                {MESES[mes]} {ano}
              </Text>
              <TouchableOpacity onPress={proximo} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Dias da semana */}
            <View style={styles.calSemana}>
              {DIAS_SEMANA.map((ds) => (
                <Text key={ds} style={[styles.calDiaSemana, { width: CELL }]}>{ds}</Text>
              ))}
            </View>

            {/* Grade de dias */}
            <View style={styles.calGrade}>
              {celulas().map((dia, i) => {
                if (dia === null) {
                  return <View key={`v${i}`} style={{ width: CELL, height: CELL }} />;
                }
                const diaDate = new Date(ano, mes, dia);
                const bloq = hoje ? diaDate.getTime() < hoje.getTime() : false;
                const sel = dataSel ? isSameDay(diaDate, dataSel) : false;
                const hj = hoje ? isSameDay(diaDate, hoje) : isSameDay(diaDate, agora);
                return (
                  <TouchableOpacity
                    key={`d${dia}`}
                    disabled={bloq}
                    onPress={() => selecionar(dia)}
                    style={[
                      styles.calDiaBtn,
                      { width: CELL, height: CELL },
                      sel && styles.calDiaSel,
                      !sel && hj && styles.calDiaHoje,
                    ]}
                  >
                    <Text style={[
                      styles.calDiaTexto,
                      bloq && styles.calDiaBloq,
                      sel && styles.calDiaSelTexto,
                      !sel && hj && styles.calDiaHojeTexto,
                    ]}>
                      {dia}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Botão fechar */}
            <TouchableOpacity onPress={fechar} style={styles.calBtnFechar}>
              <Text style={styles.calBtnFecharTexto}>FECHAR</Text>
            </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

// ─── Picker nativo para iOS ───────────────────────────────────────────────────
function PickerIOS({ value, onChange, minDate }: Props) {
  const hoje = minDate ?? new Date();
  const dataSel = parseDataBR(value) ?? hoje;
  const [showModal, setShowModal] = useState(false);
  const [temp, setTemp] = useState(dataSel);

  return (
    <>
      <TouchableOpacity style={styles.campo} onPress={() => { setTemp(dataSel); setShowModal(true); }}>
        <Feather name="calendar" size={16} color="#1A237E" />
        <Text style={[styles.campoTexto, !value && styles.placeholder]}>
          {value || "Selecionar data"}
        </Text>
      </TouchableOpacity>
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.iosOverlay}>
          <View style={styles.iosCard}>
            <View style={styles.iosHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={{ color: "#C62828", fontWeight: "bold", fontSize: 16 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { onChange(formatDateBR(temp)); setShowModal(false); }}>
                <Text style={{ color: "#1A237E", fontWeight: "bold", fontSize: 16 }}>OK</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={temp}
              mode="date"
              display="spinner"
              minimumDate={hoje}
              onChange={(_, d) => { if (d) setTemp(d); }}
              locale="pt-BR"
              style={{ width: "100%" }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Picker nativo para Android ───────────────────────────────────────────────
function PickerAndroid({ value, onChange, minDate }: Props) {
  const hoje = minDate ?? new Date();
  const dataSel = parseDataBR(value) ?? hoje;
  const [show, setShow] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.campo} onPress={() => setShow(true)}>
        <Feather name="calendar" size={16} color="#1A237E" />
        <Text style={[styles.campoTexto, !value && styles.placeholder]}>
          {value || "Selecionar data"}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={dataSel}
          mode="date"
          display="calendar"
          minimumDate={hoje}
          onChange={(_, d) => {
            setShow(false);
            if (d) onChange(formatDateBR(d));
          }}
        />
      )}
    </>
  );
}

// ─── Exportação principal ─────────────────────────────────────────────────────
export function DatePickerField(props: Props) {
  if (Platform.OS === "web") return <CalendarioWeb {...props} />;
  if (Platform.OS === "ios") return <PickerIOS {...props} />;
  return <PickerAndroid {...props} />;
}

const styles = StyleSheet.create({
  campo: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#F9FAFB",
    marginBottom: 14,
    gap: 8,
  },
  campoTexto: { flex: 1, fontSize: 15, color: "#111827" },
  placeholder: { color: "#9CA3AF" },

  // ── Calendário Web (Modal RN) ─────────────────────────────────────
  calOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  calCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    width: 290,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  calHeader: {
    backgroundColor: "#1A237E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calNavBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  calNavText: {
    color: "#fff",
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "300",
  },
  calHeaderTitulo: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  calSemana: {
    flexDirection: "row",
    backgroundColor: "#E8EAF6",
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  calDiaSemana: {
    textAlign: "center",
    fontSize: 10,
    fontWeight: "bold",
    color: "#3949AB",
  },
  calGrade: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 4,
    paddingVertical: 6,
    justifyContent: "flex-start",
  },
  calDiaBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    margin: 0,
  },
  calDiaSel: {
    backgroundColor: "#1A237E",
  },
  calDiaHoje: {
    backgroundColor: "#E8EAF6",
  },
  calDiaTexto: {
    fontSize: 14,
    color: "#111827",
  },
  calDiaBloq: {
    color: "#D1D5DB",
  },
  calDiaSelTexto: {
    color: "#fff",
    fontWeight: "bold",
  },
  calDiaHojeTexto: {
    color: "#1A237E",
    fontWeight: "bold",
  },
  calBtnFechar: {
    margin: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  calBtnFecharTexto: {
    color: "#374151",
    fontWeight: "bold",
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // ── iOS ────────────────────────────────────────────────────────────
  iosOverlay: {
    flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)",
  },
  iosCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  iosHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
});
