"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import {
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  AlertCircle,
  X,
  CheckCircle2,
  Settings,
  Layers,
  Sparkles
} from "lucide-react";

interface SppTariff {
  id: number;
  schoolUnitId: number;
  enrollmentYear: number;
  amount: number;
  developmentFee?: number;
  reRegistrationFee?: number;
  uniformFee?: number;
}

interface ExtraEquipmentTariff {
  id: number;
  schoolUnitId: number;
  enrollmentYear: number;
  level: string; // "KB", "A", or "B"
  equipmentFeeNew: number;
  extracurricularFeeNew: number;
  equipmentFeePromotion: number;
  extracurricularFeePromotion: number;
  equipmentFeeRepeat: number;
  extracurricularFeeRepeat: number;
  equipmentFee: number;
  extracurricularFee: number;
}

interface SdExtracurricular {
  id: number;
  name: string;
  fee: number;
}

interface FulldayTariff {
  id: number;
  schoolUnitId: number;
  enrollmentYear: number;
  monthlyFee: number;
}

const SCHOOL_UNITS = [
  { id: 1, name: "KB" },
  { id: 2, name: "RA" },
  { id: 3, name: "SD" },
  { id: 4, name: "TPA" },
];

export default function SppTariffsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"spp" | "extra" | "sd-extra" | "fullday">("spp");
  
  // SppTariff States
  const [tariffs, setTariffs] = useState<SppTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ExtraEquipmentTariff States
  const [extraTariffs, setExtraTariffs] = useState<ExtraEquipmentTariff[]>([]);
  const [extraLoading, setExtraLoading] = useState(false);

  // SdExtracurricular States
  const [sdExtras, setSdExtras] = useState<SdExtracurricular[]>([]);
  const [sdLoading, setSdLoading] = useState(false);

  // FulldayTariff States
  const [fulldayTariffs, setFulldayTariffs] = useState<FulldayTariff[]>([]);
  const [fulldayLoading, setFulldayLoading] = useState(false);

  // Main Tariff Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedTariff, setSelectedTariff] = useState<SppTariff | null>(null);

  // Main Tariff Form Fields
  const [formUnitId, setFormUnitId] = useState<number>(1);
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDevelopmentFee, setFormDevelopmentFee] = useState<string>("");
  const [formReRegistrationFee, setFormReRegistrationFee] = useState<string>("");
  const [formUniformFee, setFormUniformFee] = useState<string>("");

  // Extra Tariff Modal State
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [extraModalMode, setExtraModalMode] = useState<"create" | "edit">("create");
  const [selectedExtraTariff, setSelectedExtraTariff] = useState<ExtraEquipmentTariff | null>(null);

  // Extra Tariff Form Fields (6 split categories + fallback)
  const [formExtraUnitId, setFormExtraUnitId] = useState<number>(1);
  const [formExtraYear, setFormExtraYear] = useState<number>(new Date().getFullYear());
  const [formExtraLevel, setFormExtraLevel] = useState<string>("KB");
  
  const [formExtraEquipmentFeeNew, setFormExtraEquipmentFeeNew] = useState<string>("");
  const [formExtraExtracurricularFeeNew, setFormExtraExtracurricularFeeNew] = useState<string>("");
  
  const [formExtraEquipmentFeePromotion, setFormExtraEquipmentFeePromotion] = useState<string>("");
  const [formExtraExtracurricularFeePromotion, setFormExtraExtracurricularFeePromotion] = useState<string>("");
  
  const [formExtraEquipmentFeeRepeat, setFormExtraEquipmentFeeRepeat] = useState<string>("");
  const [formExtraExtracurricularFeeRepeat, setFormExtraExtracurricularFeeRepeat] = useState<string>("");

  const [formExtraEquipmentFee, setFormExtraEquipmentFee] = useState<string>("");
  const [formExtraExtracurricularFee, setFormExtraExtracurricularFee] = useState<string>("");

  // SdExtracurricular Modal State
  const [isSdModalOpen, setIsSdModalOpen] = useState(false);
  const [sdModalMode, setSdModalMode] = useState<"create" | "edit">("create");
  const [selectedSdExtra, setSelectedSdExtra] = useState<SdExtracurricular | null>(null);

  // SdExtracurricular Form Fields
  const [formSdName, setFormSdName] = useState<string>("Pramuka");
  const [formSdFee, setFormSdFee] = useState<string>("");

  // FulldayTariff Modal State
  const [isFulldayModalOpen, setIsFulldayModalOpen] = useState(false);
  const [fulldayModalMode, setFulldayModalMode] = useState<"create" | "edit">("create");
  const [selectedFulldayTariff, setSelectedFulldayTariff] = useState<FulldayTariff | null>(null);

  // FulldayTariff Form Fields
  const [formFulldayUnitId, setFormFulldayUnitId] = useState<number>(1);
  const [formFulldayYear, setFormFulldayYear] = useState<number>(new Date().getFullYear());
  const [formFulldayFee, setFormFulldayFee] = useState<string>("");

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isUnitAdmin = user?.role === "UNIT_ADMIN";
  const canManage = isSuperAdmin || isUnitAdmin;

  const fetchTariffs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/spp-tariffs");
      setTariffs(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil daftar tarif SPP");
    } finally {
      setLoading(false);
    }
  };

  const fetchExtraTariffs = async () => {
    setExtraLoading(true);
    setError(null);
    try {
      const response = await api.get("/extra-equipment-tariffs");
      setExtraTariffs(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil daftar tarif ekstra & peralatan");
    } finally {
      setExtraLoading(false);
    }
  };

  const fetchSdExtras = async () => {
    setSdLoading(true);
    setError(null);
    try {
      const response = await api.get("/sd-extracurriculars");
      setSdExtras(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil daftar eskul SD");
    } finally {
      setSdLoading(false);
    }
  };

  const fetchFulldayTariffs = async () => {
    setFulldayLoading(true);
    setError(null);
    try {
      const response = await api.get("/fullday-tariffs");
      setFulldayTariffs(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil daftar tarif fullday");
    } finally {
      setFulldayLoading(false);
    }
  };

  useEffect(() => {
    fetchTariffs();
    fetchExtraTariffs();
    fetchSdExtras();
    fetchFulldayTariffs();
  }, []);

  // Main Tariff Modal Actions
  const openCreateModal = () => {
    if (!canManage) return;
    setModalMode("create");
    setSelectedTariff(null);
    setFormUnitId(1);
    setFormYear(new Date().getFullYear());
    setFormAmount("");
    setFormDevelopmentFee("");
    setFormReRegistrationFee("");
    setFormUniformFee("");
    setIsModalOpen(true);
  };

  const openEditModal = (tariff: SppTariff) => {
    if (!canManage) return;
    setModalMode("edit");
    setSelectedTariff(tariff);
    setFormUnitId(tariff.schoolUnitId);
    setFormYear(tariff.enrollmentYear);
    setFormAmount(String(tariff.amount));
    setFormDevelopmentFee(String(tariff.developmentFee || 0));
    setFormReRegistrationFee(String(tariff.reRegistrationFee || 0));
    setFormUniformFee(String(tariff.uniformFee || 0));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setSuccessMsg(null);

    const amountNum = Number(formAmount);
    if (!formAmount || isNaN(amountNum) || amountNum <= 0) {
      setError("Nominal tarif SPP harus berupa angka positif");
      return;
    }

    const devFeeNum = Number(formDevelopmentFee || 0);
    const reRegFeeNum = Number(formReRegistrationFee || 0);
    const uniformFeeNum = Number(formUniformFee || 0);

    try {
      const payload = {
        schoolUnitId: formUnitId,
        enrollmentYear: formYear,
        amount: amountNum,
        developmentFee: devFeeNum,
        reRegistrationFee: reRegFeeNum,
        uniformFee: uniformFeeNum,
      };

      if (modalMode === "create") {
        const response = await api.post("/spp-tariffs", payload);
        setSuccessMsg(response.data.message || "Tarif SPP berhasil ditambahkan");
      } else if (modalMode === "edit" && selectedTariff) {
        const response = await api.put(`/spp-tariffs/${selectedTariff.id}`, payload);
        setSuccessMsg(response.data.message || "Tarif SPP berhasil diperbarui");
      }
      setIsModalOpen(false);
      fetchTariffs();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan tarif SPP");
    }
  };

  const handleDelete = async (id: number) => {
    if (!canManage) return;
    if (!confirm("Apakah Anda yakin ingin menghapus tarif SPP ini? Siswa yang terdaftar pada angkatan ini mungkin akan terdampak.")) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/spp-tariffs/${id}`);
      setSuccessMsg(response.data.message || "Tarif SPP berhasil dihapus");
      fetchTariffs();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus tarif SPP");
    }
  };

  // Extra Tariff Modal Actions
  const openExtraCreateModal = () => {
    if (!canManage) return;
    setExtraModalMode("create");
    setSelectedExtraTariff(null);
    setFormExtraUnitId(1);
    setFormExtraYear(new Date().getFullYear());
    setFormExtraLevel("KB");
    
    setFormExtraEquipmentFeeNew("");
    setFormExtraExtracurricularFeeNew("");
    setFormExtraEquipmentFeePromotion("");
    setFormExtraExtracurricularFeePromotion("");
    setFormExtraEquipmentFeeRepeat("");
    setFormExtraExtracurricularFeeRepeat("");
    setFormExtraEquipmentFee("");
    setFormExtraExtracurricularFee("");
    
    setIsExtraModalOpen(true);
  };

  const openExtraEditModal = (tariff: ExtraEquipmentTariff) => {
    if (!canManage) return;
    setExtraModalMode("edit");
    setSelectedExtraTariff(tariff);
    setFormExtraUnitId(tariff.schoolUnitId);
    setFormExtraYear(tariff.enrollmentYear);
    setFormExtraLevel(tariff.level);
    
    setFormExtraEquipmentFeeNew(String(tariff.equipmentFeeNew));
    setFormExtraExtracurricularFeeNew(String(tariff.extracurricularFeeNew));
    setFormExtraEquipmentFeePromotion(String(tariff.equipmentFeePromotion));
    setFormExtraExtracurricularFeePromotion(String(tariff.extracurricularFeePromotion));
    setFormExtraEquipmentFeeRepeat(String(tariff.equipmentFeeRepeat));
    setFormExtraExtracurricularFeeRepeat(String(tariff.extracurricularFeeRepeat));
    setFormExtraEquipmentFee(String(tariff.equipmentFee));
    setFormExtraExtracurricularFee(String(tariff.extracurricularFee));
    
    setIsExtraModalOpen(true);
  };

  const handleExtraSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setSuccessMsg(null);

    const equipNewNum = Number(formExtraEquipmentFeeNew || 0);
    const extraNewNum = Number(formExtraExtracurricularFeeNew || 0);
    const equipPromNum = Number(formExtraEquipmentFeePromotion || 0);
    const extraPromNum = Number(formExtraExtracurricularFeePromotion || 0);
    const equipRepeatNum = Number(formExtraEquipmentFeeRepeat || 0);
    const extraRepeatNum = Number(formExtraExtracurricularFeeRepeat || 0);
    
    const equipFeeNum = Number(formExtraEquipmentFee || 0);
    const extraFeeNum = Number(formExtraExtracurricularFee || 0);

    if (
      isNaN(equipNewNum) || equipNewNum < 0 || isNaN(extraNewNum) || extraNewNum < 0 ||
      isNaN(equipPromNum) || equipPromNum < 0 || isNaN(extraPromNum) || extraPromNum < 0 ||
      isNaN(equipRepeatNum) || equipRepeatNum < 0 || isNaN(extraRepeatNum) || extraRepeatNum < 0 ||
      isNaN(equipFeeNum) || equipFeeNum < 0 || isNaN(extraFeeNum) || extraFeeNum < 0
    ) {
      setError("Nominal biaya harus berupa angka non-negatif");
      return;
    }

    try {
      const payload = {
        schoolUnitId: formExtraUnitId,
        enrollmentYear: formExtraYear,
        level: formExtraLevel,
        equipmentFeeNew: equipNewNum,
        extracurricularFeeNew: extraNewNum,
        equipmentFeePromotion: equipPromNum,
        extracurricularFeePromotion: extraPromNum,
        equipmentFeeRepeat: equipRepeatNum,
        extracurricularFeeRepeat: extraRepeatNum,
        equipmentFee: equipFeeNum || equipNewNum,
        extracurricularFee: extraFeeNum || extraNewNum,
      };

      if (extraModalMode === "create") {
        const response = await api.post("/extra-equipment-tariffs", payload);
        setSuccessMsg(response.data.message || "Tarif ekstra & peralatan berhasil ditambahkan");
      } else if (extraModalMode === "edit" && selectedExtraTariff) {
        const response = await api.put(`/extra-equipment-tariffs/${selectedExtraTariff.id}`, payload);
        setSuccessMsg(response.data.message || "Tarif ekstra & peralatan berhasil diperbarui");
      }
      setIsExtraModalOpen(false);
      fetchExtraTariffs();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan tarif ekstra & peralatan");
    }
  };

  const handleExtraDelete = async (id: number) => {
    if (!canManage) return;
    if (!confirm("Apakah Anda yakin ingin menghapus tarif ekstra & peralatan ini?")) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/extra-equipment-tariffs/${id}`);
      setSuccessMsg(response.data.message || "Tarif ekstra & peralatan berhasil dihapus");
      fetchExtraTariffs();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus tarif");
    }
  };

  // SdExtracurricular Modal Actions
  const openSdCreateModal = () => {
    if (!canManage) return;
    setSdModalMode("create");
    setSelectedSdExtra(null);
    setFormSdName("");
    setFormSdFee("");
    setIsSdModalOpen(true);
  };

  const openSdEditModal = (item: SdExtracurricular) => {
    if (!canManage) return;
    setSdModalMode("edit");
    setSelectedSdExtra(item);
    setFormSdName(item.name);
    setFormSdFee(String(item.fee));
    setIsSdModalOpen(true);
  };

  const handleSdSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setSuccessMsg(null);

    const feeNum = Number(formSdFee || 0);
    if (!formSdName.trim()) {
      setError("Nama ekstrakurikuler SD tidak boleh kosong");
      return;
    }
    if (isNaN(feeNum) || feeNum < 0) {
      setError("Nominal biaya harus berupa angka non-negatif");
      return;
    }

    try {
      const payload = {
        name: formSdName.trim(),
        fee: feeNum,
      };

      if (sdModalMode === "create") {
        const response = await api.post("/sd-extracurriculars", payload);
        setSuccessMsg(response.data.message || "Ekskul SD berhasil ditambahkan");
      } else if (sdModalMode === "edit" && selectedSdExtra) {
        const response = await api.put(`/sd-extracurriculars/${selectedSdExtra.id}`, payload);
        setSuccessMsg(response.data.message || "Ekskul SD berhasil diperbarui");
      }
      setIsSdModalOpen(false);
      fetchSdExtras();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menyimpan ekskul SD");
    }
  };

  const handleSdDelete = async (id: number) => {
    if (!canManage) return;
    if (!confirm("Apakah Anda yakin ingin menghapus ekskul SD ini?")) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/sd-extracurriculars/${id}`);
      setSuccessMsg(response.data.message || "Ekskul SD berhasil dihapus");
      fetchSdExtras();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus ekskul SD");
    }
  };

  // FulldayTariff Modal Actions
  const openFulldayCreateModal = () => {
    if (!canManage) return;
    setFulldayModalMode("create");
    setSelectedFulldayTariff(null);
    setFormFulldayUnitId(1);
    setFormFulldayYear(new Date().getFullYear());
    setFormFulldayFee("");
    setIsFulldayModalOpen(true);
  };

  const openFulldayEditModal = (item: FulldayTariff) => {
    if (!canManage) return;
    setFulldayModalMode("edit");
    setSelectedFulldayTariff(item);
    setFormFulldayUnitId(item.schoolUnitId);
    setFormFulldayYear(item.enrollmentYear);
    setFormFulldayFee(String(item.monthlyFee));
    setIsFulldayModalOpen(true);
  };

  const handleFulldaySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setError(null);
    setSuccessMsg(null);

    const feeNum = Number(formFulldayFee || 0);
    if (isNaN(feeNum) || feeNum < 0) {
      setError("Nominal tarif Fullday harus berupa angka non-negatif");
      return;
    }

    try {
      const payload = {
        schoolUnitId: formFulldayUnitId,
        enrollmentYear: formFulldayYear,
        monthlyFee: feeNum,
      };

      if (fulldayModalMode === "create") {
        const response = await api.post("/fullday-tariffs", payload);
        setSuccessMsg(response.data.message || "Tarif Fullday berhasil ditambahkan");
      } else if (fulldayModalMode === "edit" && selectedFulldayTariff) {
        const response = await api.put(`/fullday-tariffs/${selectedFulldayTariff.id}`, payload);
        setSuccessMsg(response.data.message || "Tarif Fullday berhasil diperbarui");
      }
      setIsFulldayModalOpen(false);
      fetchFulldayTariffs();
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      const validationErrors = err.response?.data?.errors;
      if (validationErrors && Array.isArray(validationErrors)) {
        const detailMsg = validationErrors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
        setError(`${serverMsg} (${detailMsg})`);
      } else {
        setError(serverMsg || "Gagal menyimpan tarif Fullday");
      }
    }
  };

  const handleFulldayDelete = async (id: number) => {
    if (!canManage) return;
    if (!confirm("Apakah Anda yakin ingin menghapus tarif Fullday ini?")) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/fullday-tariffs/${id}`);
      setSuccessMsg(response.data.message || "Tarif Fullday berhasil dihapus");
      fetchFulldayTariffs();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menghapus tarif Fullday");
    }
  };

  const getUnitName = (unitId: number) => {
    return SCHOOL_UNITS.find((u) => u.id === unitId)?.name || `Unit ${unitId}`;
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleExtraUnitChange = (unitId: number) => {
    setFormExtraUnitId(unitId);
    if (unitId === 1) {
      setFormExtraLevel("KB");
    } else if (unitId === 2) {
      setFormExtraLevel("A");
    }
  };

  return (
    <div className="space-y-6 relative text-xs">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-400" />
            Master Tarif SPP & Biaya Tambahan
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi tarif dasar bulanan SPP, uang gedung, biaya peralatan, eskul, serta uang daftar ulang.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => {
              if (activeTab === "spp") openCreateModal();
              else if (activeTab === "extra") openExtraCreateModal();
              else if (activeTab === "sd-extra") openSdCreateModal();
              else if (activeTab === "fullday") openFulldayCreateModal();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {activeTab === "spp"
              ? "Tambah Tarif SPP"
              : activeTab === "extra"
              ? "Tambah Tarif Ekstra/Peralatan"
              : activeTab === "sd-extra"
              ? "Tambah Eskkul SD"
              : "Tambah Tarif Fullday"}
          </button>
        )}
      </div>

      {/* Tabs System */}
      <div className="flex border-b border-slate-800/80 gap-6">
        <button
          onClick={() => {
            setActiveTab("spp");
            setError(null);
            setSuccessMsg(null);
          }}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === "spp"
              ? "text-indigo-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Tarif Utama (SPP & Uang Gedung)
          {activeTab === "spp" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></div>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("extra");
            setError(null);
            setSuccessMsg(null);
          }}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === "extra"
              ? "text-indigo-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Tarif Ekstra & Peralatan (KB & RA)
          {activeTab === "extra" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></div>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("sd-extra");
            setError(null);
            setSuccessMsg(null);
          }}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === "sd-extra"
              ? "text-indigo-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Eskul SD (Opsional)
          {activeTab === "sd-extra" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></div>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("fullday");
            setError(null);
            setSuccessMsg(null);
          }}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === "fullday"
              ? "text-indigo-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Fullday (KB & RA)
          {activeTab === "fullday" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></div>
          )}
        </button>
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-lg text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 p-3 rounded-lg text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: Main SPP Tariffs */}
      {activeTab === "spp" && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
                Memuat data tarif dasar SPP...
              </div>
            ) : tariffs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                Tidak ada data konfigurasi tarif dasar SPP.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    <th className="px-6 py-4">Unit Sekolah</th>
                    <th className="px-6 py-4">Tahun Angkatan</th>
                    <th className="px-6 py-4">Tarif Bulanan SPP</th>
                    <th className="px-6 py-4">Uang Pengembangan</th>
                    <th className="px-6 py-4">Uang Daftar Ulang</th>
                    <th className="px-6 py-4">Biaya Seragam</th>
                    {isSuperAdmin && <th className="px-6 py-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                  {tariffs.map((tariff) => (
                    <tr
                      key={tariff.id}
                      className="hover:bg-slate-800/10 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-white">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                          {getUnitName(tariff.schoolUnitId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-300">
                        Angkatan {tariff.enrollmentYear}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {formatRupiah(tariff.amount)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-300">
                        {formatRupiah(tariff.developmentFee || 0)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-300">
                        {formatRupiah(tariff.reRegistrationFee || 0)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-300">
                        {formatRupiah(tariff.uniformFee || 0)}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => openEditModal(tariff)}
                              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Edit Tarif"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(tariff.id)}
                              className="p-1.5 rounded-lg border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Hapus Tarif"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Extra & Equipment Tariffs */}
      {activeTab === "extra" && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            {extraLoading ? (
              <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
                Memuat data tarif tambahan...
              </div>
            ) : extraTariffs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                Tidak ada data konfigurasi tarif ekstra dan peralatan.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-4" rowSpan={2}>Unit Sekolah</th>
                    <th className="px-4 py-4" rowSpan={2}>Tahun Angkatan</th>
                    <th className="px-4 py-4" rowSpan={2}>Tingkatan</th>
                    <th className="px-4 py-2 text-center border-b border-slate-800/80" colSpan={3}>Uang Peralatan (IDR)</th>
                    <th className="px-4 py-2 text-center border-b border-slate-800/80" colSpan={3}>Ekstrakurikuler (IDR)</th>
                    {isSuperAdmin && <th className="px-4 py-4 text-right" rowSpan={2}>Aksi</th>}
                  </tr>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    <th className="px-2 py-2 border-r border-slate-800/40">Baru</th>
                    <th className="px-2 py-2 border-r border-slate-800/40">Naik</th>
                    <th className="px-2 py-2">Tinggal</th>
                    <th className="px-2 py-2 border-l border-r border-slate-800/40">Baru</th>
                    <th className="px-2 py-2 border-r border-slate-800/40">Naik</th>
                    <th className="px-2 py-2">Tinggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                  {extraTariffs.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-800/10 transition-colors"
                    >
                      <td className="px-4 py-4 font-semibold text-white">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border bg-violet-500/10 text-violet-400 border-violet-500/20">
                          {getUnitName(t.schoolUnitId)}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-300">
                        Angkatan {t.enrollmentYear}
                      </td>
                      <td className="px-4 py-4 font-bold text-white">
                        {t.schoolUnitId === 2 ? `Kelompok ${t.level}` : t.level}
                      </td>
                      
                      {/* Peralatan */}
                      <td className="px-2 py-4 text-center font-bold text-emerald-400 border-r border-slate-800/20">
                        {formatRupiah(t.equipmentFeeNew)}
                      </td>
                      <td className="px-2 py-4 text-center font-bold text-sky-400 border-r border-slate-800/20">
                        {formatRupiah(t.equipmentFeePromotion)}
                      </td>
                      <td className="px-2 py-4 text-center font-bold text-rose-400">
                        {formatRupiah(t.equipmentFeeRepeat)}
                      </td>

                      {/* Ekskul */}
                      <td className="px-2 py-4 text-center font-bold text-emerald-400 border-l border-r border-slate-800/20">
                        {formatRupiah(t.extracurricularFeeNew)}
                      </td>
                      <td className="px-2 py-4 text-center font-bold text-sky-400 border-r border-slate-800/20">
                        {formatRupiah(t.extracurricularFeePromotion)}
                      </td>
                      <td className="px-2 py-4 text-center font-bold text-rose-400">
                        {formatRupiah(t.extracurricularFeeRepeat)}
                      </td>

                      {isSuperAdmin && (
                        <td className="px-4 py-4 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => openExtraEditModal(t)}
                              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Edit Tarif"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleExtraDelete(t.id)}
                              className="p-1.5 rounded-lg border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Hapus Tarif"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SD Extracurriculars */}
      {activeTab === "sd-extra" && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            {sdLoading ? (
              <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
                Memuat data ekskul SD...
              </div>
            ) : sdExtras.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                Belum ada data kegiatan ekstrakurikuler SD. Klik "Tambah Eskkul SD" untuk memulai.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    <th className="px-6 py-4">Nama Kegiatan Ekstrakurikuler</th>
                    <th className="px-6 py-4">Biaya Kegiatan (IDR)</th>
                    {isSuperAdmin && <th className="px-6 py-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                  {sdExtras.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/10 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
                        {item.name}
                      </td>
                      <td className="px-6 py-4 font-semibold text-indigo-400">
                        {formatRupiah(item.fee)}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => openSdEditModal(item)}
                              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Edit Eskkul"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleSdDelete(item.id)}
                              className="p-1.5 rounded-lg border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Hapus Eskkul"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Fullday Tariffs (KB & RA) */}
      {activeTab === "fullday" && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            {fulldayLoading ? (
              <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
                Memuat data tarif Fullday...
              </div>
            ) : fulldayTariffs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                Belum ada data konfigurasi tarif Fullday (KB & RA). Klik "Tambah Tarif Fullday" untuk menambahkan.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    <th className="px-6 py-4">Unit Sekolah</th>
                    <th className="px-6 py-4">Tahun Angkatan</th>
                    <th className="px-6 py-4">Biaya Fullday Bulanan (IDR)</th>
                    {isSuperAdmin && <th className="px-6 py-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                  {fulldayTariffs.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/10 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-white">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">
                          {getUnitName(item.schoolUnitId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-300">
                        Angkatan {item.enrollmentYear}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-400">
                        {formatRupiah(item.monthlyFee)}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => openFulldayEditModal(item)}
                              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Edit Tarif"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFulldayDelete(item.id)}
                              className="p-1.5 rounded-lg border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Hapus Tarif"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Main SPP Tariff CRUD Dialog */}
      {isModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-6">
              {modalMode === "create" ? "Konfigurasi Tarif SPP Baru" : "Edit Nominal Tarif SPP"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Unit field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Unit Sekolah</label>
                {modalMode === "create" ? (
                  <select
                    value={formUnitId}
                    onChange={(e) => setFormUnitId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {SCHOOL_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                    {getUnitName(formUnitId)}
                  </div>
                )}
              </div>

              {/* Enrollment Year field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Tahun Angkatan</label>
                {modalMode === "create" ? (
                  <input
                    type="number"
                    min="2000"
                    max="9999"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                ) : (
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                    Angkatan {formYear}
                  </div>
                )}
              </div>

              {/* Amount field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Tarif Bulanan SPP (IDR)</label>
                <input
                   type="number"
                   placeholder="Contoh: 150000"
                   value={formAmount}
                   onChange={(e) => setFormAmount(e.target.value)}
                   className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Development Fee */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Uang Pengembangan (IDR)</label>
                <input
                  type="number"
                  placeholder="Contoh: 1000000"
                  value={formDevelopmentFee}
                  onChange={(e) => setFormDevelopmentFee(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Re-registration Fee */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Uang Daftar Ulang (IDR)</label>
                <input
                  type="number"
                  placeholder="Contoh: 250000"
                  value={formReRegistrationFee}
                  onChange={(e) => setFormReRegistrationFee(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Uniform Fee */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Biaya Seragam (IDR)</label>
                <input
                  type="number"
                  placeholder="Contoh: 600000"
                  value={formUniformFee}
                  onChange={(e) => setFormUniformFee(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md shadow-indigo-500/10 transition-colors cursor-pointer"
                >
                  {modalMode === "create" ? "Tambah Tarif" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extra Tariff CRUD Dialog */}
      {isExtraModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsExtraModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-6">
              {extraModalMode === "create" ? "Konfigurasi Tarif Ekstra & Peralatan Baru" : "Edit Nominal Tarif"}
            </h2>

            <form onSubmit={handleExtraSave} className="space-y-4 text-xs">
              {/* Unit & Year Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Unit Sekolah (KB / RA)</label>
                  {extraModalMode === "create" ? (
                    <select
                      value={formExtraUnitId}
                      onChange={(e) => handleExtraUnitChange(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value={1}>KB</option>
                      <option value={2}>RA</option>
                    </select>
                  ) : (
                    <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                      {getUnitName(formExtraUnitId)}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Tahun Angkatan</label>
                  {extraModalMode === "create" ? (
                    <input
                      type="number"
                      min="2000"
                      max="9999"
                      value={formExtraYear}
                      onChange={(e) => setFormExtraYear(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  ) : (
                    <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                      Angkatan {formExtraYear}
                    </div>
                  )}
                </div>
              </div>

              {/* Level / Tingkat field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Tingkatan</label>
                {extraModalMode === "create" ? (
                  formExtraUnitId === 1 ? (
                    <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                      KB
                    </div>
                  ) : (
                    <select
                      value={formExtraLevel}
                      onChange={(e) => setFormExtraLevel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="A">Kelompok A</option>
                      <option value="B">Kelompok B</option>
                    </select>
                  )
                ) : (
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg text-slate-400">
                    {formExtraUnitId === 2 ? `Kelompok ${formExtraLevel}` : formExtraLevel}
                  </div>
                )}
              </div>

              {/* Murid Baru (BARU) Section */}
              <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-xl space-y-3">
                <h3 className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Kategori: Murid Baru (BARU)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-slate-400">Uang Peralatan (IDR)</label>
                    <input
                      type="number"
                      placeholder="Contoh: 300000"
                      value={formExtraEquipmentFeeNew}
                      onChange={(e) => setFormExtraEquipmentFeeNew(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400">Uang Ekskul (IDR)</label>
                    <input
                      type="number"
                      placeholder="Contoh: 150000"
                      value={formExtraExtracurricularFeeNew}
                      onChange={(e) => setFormExtraExtracurricularFeeNew(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Naik Kelas (NAIK_KELAS) Section */}
              <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-xl space-y-3">
                <h3 className="font-bold text-sky-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  Kategori: Naik Kelas (NAIK_KELAS)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-slate-400">Uang Peralatan (IDR)</label>
                    <input
                      type="number"
                      placeholder="Contoh: 150000"
                      value={formExtraEquipmentFeePromotion}
                      onChange={(e) => setFormExtraEquipmentFeePromotion(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400">Uang Ekskul (IDR)</label>
                    <input
                      type="number"
                      placeholder="Contoh: 150000"
                      value={formExtraExtracurricularFeePromotion}
                      onChange={(e) => setFormExtraExtracurricularFeePromotion(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Tinggal Kelas (TINGGAL_KELAS) Section */}
              <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-xl space-y-3">
                <h3 className="font-bold text-rose-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Kategori: Tinggal Kelas (TINGGAL_KELAS)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-slate-400">Uang Peralatan (IDR)</label>
                    <input
                      type="number"
                      placeholder="Contoh: 150000"
                      value={formExtraEquipmentFeeRepeat}
                      onChange={(e) => setFormExtraEquipmentFeeRepeat(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400">Uang Ekskul (IDR)</label>
                    <input
                      type="number"
                      placeholder="Contoh: 150000"
                      value={formExtraExtracurricularFeeRepeat}
                      onChange={(e) => setFormExtraExtracurricularFeeRepeat(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={() => setIsExtraModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md shadow-indigo-500/10 transition-colors cursor-pointer"
                >
                  {extraModalMode === "create" ? "Tambah Tarif" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SD Extracurricular CRUD Dialog */}
      {isSdModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setIsSdModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-6">
              {sdModalMode === "create" ? "Tambah Kegiatan Ekskul SD Baru" : "Edit Ekskul SD"}
            </h2>

            <form onSubmit={handleSdSave} className="space-y-4 text-xs">
              {/* Name field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Nama Kegiatan Ekskul</label>
                <input
                  type="text"
                  placeholder="Contoh: Panahan, Pramuka, Taekwondo"
                  value={formSdName}
                  onChange={(e) => setFormSdName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              {/* Fee field */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Biaya Ekskul per Bulan (IDR)</label>
                <input
                  type="number"
                  placeholder="Contoh: 100000"
                  value={formSdFee}
                  onChange={(e) => setFormSdFee(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={() => setIsSdModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md shadow-indigo-500/10 transition-colors cursor-pointer"
                >
                  {sdModalMode === "create" ? "Tambah Ekskul" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullday Tariff CRUD Dialog */}
      {isFulldayModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setIsFulldayModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-6">
              {fulldayModalMode === "create" ? "Tambah Tarif Fullday (KB & RA)" : "Edit Tarif Fullday"}
            </h2>

            <form onSubmit={handleFulldaySave} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Unit Sekolah</label>
                <select
                  value={formFulldayUnitId}
                  onChange={(e) => setFormFulldayUnitId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value={1}>KB</option>
                  <option value={2}>RA</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Tahun Angkatan</label>
                <input
                  type="number"
                  min="2000"
                  max="9999"
                  value={formFulldayYear}
                  onChange={(e) => setFormFulldayYear(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Biaya Fullday Bulanan (IDR)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Contoh: 250000"
                  value={formFulldayFee}
                  onChange={(e) => setFormFulldayFee(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsFulldayModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
