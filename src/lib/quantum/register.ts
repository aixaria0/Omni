export type BasisAmplitude = {
  basis: string;
  probability: number;
  real: number;
  imag: number;
};

export type RegisterSummary = {
  qubits: number;
  dimension: number;
  norm: number;
  nonZero: number;
  meanZ: number;
  globalX: number;
  perfectZPairs: number;
  totalPairs: number;
};

const EPSILON = 1e-12;

export class QuantumRegister {
  readonly qubits: number;
  readonly dimension: number;
  private real: Float64Array;
  private imag: Float64Array;

  constructor(qubits = 12, initial: "ghz" | "zero" = "ghz") {
    if (!Number.isInteger(qubits) || qubits < 1 || qubits > 20) {
      throw new Error("qubits must be an integer between 1 and 20");
    }
    this.qubits = qubits;
    this.dimension = 1 << qubits;
    this.real = new Float64Array(this.dimension);
    this.imag = new Float64Array(this.dimension);
    if (initial === "ghz") this.resetGhz();
    else this.resetZero();
  }

  clone() {
    const copy = new QuantumRegister(this.qubits, "zero");
    copy.real.set(this.real);
    copy.imag.set(this.imag);
    return copy;
  }

  resetZero() {
    this.real.fill(0);
    this.imag.fill(0);
    this.real[0] = 1;
  }

  resetGhz() {
    this.real.fill(0);
    this.imag.fill(0);
    const amplitude = 1 / Math.sqrt(2);
    this.real[0] = amplitude;
    this.real[this.dimension - 1] = amplitude;
  }

  applyH(qubit: number) {
    const s = 1 / Math.sqrt(2);
    this.applyRealGate(qubit, s, s, s, -s);
  }

  applyX(qubit: number) {
    this.applyRealGate(qubit, 0, 1, 1, 0);
  }

  applyRy(qubit: number, theta: number) {
    if (!Number.isFinite(theta)) throw new Error("theta must be finite");
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    this.applyRealGate(qubit, c, -s, s, c);
  }

  applyCnot(control: number, target: number) {
    this.assertQubit(control);
    this.assertQubit(target);
    if (control === target) throw new Error("control and target must differ");
    const controlMask = this.mask(control);
    const targetMask = this.mask(target);
    for (let i = 0; i < this.dimension; i += 1) {
      if ((i & controlMask) === 0 || (i & targetMask) !== 0) continue;
      const j = i | targetMask;
      [this.real[i], this.real[j]] = [this.real[j], this.real[i]];
      [this.imag[i], this.imag[j]] = [this.imag[j], this.imag[i]];
    }
  }

  measureAll(random: () => number = Math.random) {
    const r = Math.min(Math.max(random(), 0), 1 - Number.EPSILON);
    let cumulative = 0;
    let outcome = this.dimension - 1;
    for (let i = 0; i < this.dimension; i += 1) {
      cumulative += this.probabilityAt(i);
      if (r < cumulative) {
        outcome = i;
        break;
      }
    }
    const probability = this.probabilityAt(outcome);
    this.real.fill(0);
    this.imag.fill(0);
    this.real[outcome] = 1;
    return {
      bitstring: outcome.toString(2).padStart(this.qubits, "0"),
      probability,
    };
  }

  expectationZ(qubit: number) {
    this.assertQubit(qubit);
    const mask = this.mask(qubit);
    let value = 0;
    for (let i = 0; i < this.dimension; i += 1) {
      value += ((i & mask) === 0 ? 1 : -1) * this.probabilityAt(i);
    }
    return this.clean(value);
  }

  expectationZZ(a: number, b: number) {
    this.assertQubit(a);
    this.assertQubit(b);
    if (a === b) return 1;
    const maskA = this.mask(a);
    const maskB = this.mask(b);
    let value = 0;
    for (let i = 0; i < this.dimension; i += 1) {
      const za = (i & maskA) === 0 ? 1 : -1;
      const zb = (i & maskB) === 0 ? 1 : -1;
      value += za * zb * this.probabilityAt(i);
    }
    return this.clean(value);
  }

  expectationXX(a: number, b: number) {
    return this.expectationPairPauli(a, b, "x");
  }

  expectationYY(a: number, b: number) {
    return this.expectationPairPauli(a, b, "y");
  }

  expectationGlobalX() {
    const allMask = this.dimension - 1;
    let value = 0;
    for (let i = 0; i < this.dimension; i += 1) {
      const j = i ^ allMask;
      value += this.real[i] * this.real[j] + this.imag[i] * this.imag[j];
    }
    return this.clean(value);
  }

  norm() {
    let total = 0;
    for (let i = 0; i < this.dimension; i += 1) total += this.probabilityAt(i);
    return total;
  }

  nonZeroCount(threshold = 1e-10) {
    let count = 0;
    const squared = threshold * threshold;
    for (let i = 0; i < this.dimension; i += 1) {
      if (this.probabilityAt(i) > squared) count += 1;
    }
    return count;
  }

  topAmplitudes(limit = 8): BasisAmplitude[] {
    const rows: BasisAmplitude[] = [];
    for (let i = 0; i < this.dimension; i += 1) {
      const probability = this.probabilityAt(i);
      if (probability <= EPSILON) continue;
      rows.push({
        basis: i.toString(2).padStart(this.qubits, "0"),
        probability,
        real: this.real[i],
        imag: this.imag[i],
      });
    }
    rows.sort((a, b) => b.probability - a.probability || a.basis.localeCompare(b.basis));
    return rows.slice(0, limit);
  }

  summary(): RegisterSummary {
    let meanZ = 0;
    for (let q = 0; q < this.qubits; q += 1) meanZ += this.expectationZ(q);
    meanZ /= this.qubits;

    let perfectZPairs = 0;
    let totalPairs = 0;
    for (let a = 0; a < this.qubits; a += 1) {
      for (let b = a + 1; b < this.qubits; b += 1) {
        totalPairs += 1;
        if (Math.abs(this.expectationZZ(a, b) - 1) < 1e-9) perfectZPairs += 1;
      }
    }

    return {
      qubits: this.qubits,
      dimension: this.dimension,
      norm: this.clean(this.norm()),
      nonZero: this.nonZeroCount(),
      meanZ: this.clean(meanZ),
      globalX: this.expectationGlobalX(),
      perfectZPairs,
      totalPairs,
    };
  }

  private applyRealGate(qubit: number, m00: number, m01: number, m10: number, m11: number) {
    this.assertQubit(qubit);
    const mask = this.mask(qubit);
    for (let i = 0; i < this.dimension; i += 1) {
      if ((i & mask) !== 0) continue;
      const j = i | mask;
      const ar = this.real[i];
      const ai = this.imag[i];
      const br = this.real[j];
      const bi = this.imag[j];
      this.real[i] = m00 * ar + m01 * br;
      this.imag[i] = m00 * ai + m01 * bi;
      this.real[j] = m10 * ar + m11 * br;
      this.imag[j] = m10 * ai + m11 * bi;
    }
  }

  private expectationPairPauli(a: number, b: number, axis: "x" | "y") {
    this.assertQubit(a);
    this.assertQubit(b);
    if (a === b) return 1;
    const maskA = this.mask(a);
    const maskB = this.mask(b);
    const flipMask = maskA | maskB;
    let value = 0;
    for (let i = 0; i < this.dimension; i += 1) {
      const j = i ^ flipMask;
      const sameBit = ((i & maskA) === 0) === ((i & maskB) === 0);
      const phase = axis === "x" ? 1 : (sameBit ? -1 : 1);
      value += phase * (this.real[i] * this.real[j] + this.imag[i] * this.imag[j]);
    }
    return this.clean(value);
  }

  private probabilityAt(index: number) {
    return this.real[index] * this.real[index] + this.imag[index] * this.imag[index];
  }

  private mask(qubit: number) {
    return 1 << (this.qubits - 1 - qubit);
  }

  private assertQubit(qubit: number) {
    if (!Number.isInteger(qubit) || qubit < 0 || qubit >= this.qubits) {
      throw new Error(`qubit must be between 0 and ${this.qubits - 1}`);
    }
  }

  private clean(value: number) {
    return Math.abs(value) < EPSILON ? 0 : value;
  }
}
