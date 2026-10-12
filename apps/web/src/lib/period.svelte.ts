/** Mês exibido nas telas (YYYY-MM). Começa sempre no mês atual: um mês novo nasce zerado. */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

class Period {
  month = $state(currentMonth());

  /** Mês anterior ao exibido, para as variações em relação ao mês passado. */
  get previous(): string {
    const [year = 0, month = 1] = this.month.split("-").map(Number);
    const date = new Date(year, month - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
}

export const period = new Period();