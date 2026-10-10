import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HybridCertificate } from "./cert";

type CertificateState = {
  certificates: HybridCertificate[];
  addCertificate: (certificate: HybridCertificate) => void;
  clearCertificates: () => void;
};

export const useCertificateStore = create<CertificateState>()(
  persist(
    (set, get) => ({
      certificates: [],
      addCertificate: (certificate) => {
        const certificates = [
          certificate,
          ...get().certificates.filter((item) => item.id !== certificate.id),
        ].slice(0, 40);
        set({ certificates });
      },
      clearCertificates: () => set({ certificates: [] }),
    }),
    {
      name: "omni-quantum-certificates-v1",
    },
  ),
);
