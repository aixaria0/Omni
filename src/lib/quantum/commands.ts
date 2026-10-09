import { QuantumRegister } from "./register.ts";

export type CommandResult = {
  message: string;
  destructive?: boolean;
};

function firstInts(input: string, count: number) {
  return [...input.matchAll(/-?\d+(?:\.\d+)?/g)]
    .slice(0, count)
    .map((m) => Number(m[0]));
}

function format(value: number) {
  return Math.abs(value) < 1e-12 ? "0.000000" : value.toFixed(6);
}

export function executeQuantumCommand(
  register: QuantumRegister,
  raw: string,
): CommandResult {
  const source = raw.trim();
  const input = source.toLowerCase().replace(/\s+/g, " ");
  if (!input) return { message: "Enter a quantum operation or query." };

  if (/^(ghz|reset ghz|reset to ghz)$/.test(input) || /reset.*ghz/.test(input)) {
    register.resetGhz();
    return { message: `GHZ_${register.qubits} restored: (|0…0⟩ + |1…1⟩)/√2.`, destructive: true };
  }

  if (/^(zero|reset zero|reset to zero)$/.test(input) || /reset.*zero/.test(input)) {
    register.resetZero();
    return { message: `Register reset to |${"0".repeat(register.qubits)}⟩.`, destructive: true };
  }

  if (/^(m|measure|measure all|m all)$/.test(input) || /measure.*(all|everything)/.test(input)) {
    const outcome = register.measureAll();
    return {
      message: `Measured |${outcome.bitstring}⟩ (Born probability before collapse ${(outcome.probability * 100).toFixed(2)}%).`,
      destructive: true,
    };
  }

  if (/^(status|state|summary)$/.test(input) || /show.*(state|status|probability)/.test(input)) {
    const s = register.summary();
    return {
      message: `dim=${s.dimension}; norm=${s.norm.toFixed(12)}; nonzero=${s.nonZero}; ⟨X⊗${s.qubits}⟩=${format(s.globalX)}; perfect Z-pairs=${s.perfectZPairs}/${s.totalPairs}.`,
    };
  }

  if (/^(global x|x global|xxx+|x all)$/.test(input) || /global.*x/.test(input)) {
    return { message: `⟨X₀X₁…X${register.qubits - 1}⟩ = ${format(register.expectationGlobalX())}` };
  }

  if (/^zz\b/.test(input) || /expectation.*z.*z/.test(input)) {
    const [a, b] = firstInts(input, 2);
    if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error("ZZ needs two qubit indexes");
    return { message: `⟨Z${a}Z${b}⟩ = ${format(register.expectationZZ(a, b))}` };
  }

  if (/^z\b/.test(input) || /expectation.*z/.test(input)) {
    const [q] = firstInts(input, 1);
    if (!Number.isInteger(q)) throw new Error("Z needs one qubit index");
    return { message: `⟨Z${q}⟩ = ${format(register.expectationZ(q))}` };
  }

  if (/^cnot\b/.test(input) || /controlled.?not/.test(input)) {
    const [control, target] = firstInts(input, 2);
    if (!Number.isInteger(control) || !Number.isInteger(target)) {
      throw new Error("CNOT needs control and target qubit indexes");
    }
    register.applyCnot(control, target);
    return { message: `CNOT(${control} → ${target}) applied.`, destructive: true };
  }

  if (/^ry\b/.test(input) || /rotate.*\by\b/.test(input)) {
    const [qubit, theta] = firstInts(input, 2);
    if (!Number.isInteger(qubit) || !Number.isFinite(theta)) {
      throw new Error("RY needs a qubit index and an angle in radians");
    }
    register.applyRy(qubit, theta);
    return { message: `RY(${qubit}, ${theta.toFixed(4)} rad) applied.`, destructive: true };
  }

  if (/^h\b/.test(input) || /hadamard/.test(input)) {
    const [qubit] = firstInts(input, 1);
    if (!Number.isInteger(qubit)) throw new Error("Hadamard needs one qubit index");
    register.applyH(qubit);
    return { message: `H(${qubit}) applied.`, destructive: true };
  }

  if (/^x\b/.test(input) || /flip.*qubit/.test(input)) {
    const [qubit] = firstInts(input, 1);
    if (!Number.isInteger(qubit)) throw new Error("X needs one qubit index");
    register.applyX(qubit);
    return { message: `X(${qubit}) applied.`, destructive: true };
  }

  return {
    message:
      "Unknown command. Try: H 0, CNOT 0 1, RY 3 0.5, Z 5, ZZ 0 5, measure all, status, GHZ, or ZERO.",
  };
}
