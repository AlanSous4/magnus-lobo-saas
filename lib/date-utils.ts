export function parseDateSafe(date: string | null) {
    if (!date) return null
    return new Date(date + "T12:00:00")
  }
  
  export function formatDateBR(date: string | null) {
    if (!date) return "-";
    return new Date(date + "T12:00:00").toLocaleDateString("pt-BR");
  }
  
  export function formatDateForInput(date: string | null) {
    if (!date) return ""
    return date.split("T")[0]
  }