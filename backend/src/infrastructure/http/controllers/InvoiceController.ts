import type { Request, Response, NextFunction } from "express";
import type { ProcessOfflinePaymentUseCase } from "../../../application/use-cases/ProcessOfflinePaymentUseCase.js";
import type { IStudentRepository } from "../../../domain/repositories/IStudentRepository.js";
import type { IInvoiceRepository } from "../../../domain/repositories/IInvoiceRepository.js";
import type { ISppTariffRepository } from "../../../domain/repositories/ISppTariffRepository.js";
import { InvoiceStatus, InvoiceType } from "@prisma/client";

export class InvoiceController {
  constructor(
    private processOfflinePaymentUseCase: ProcessOfflinePaymentUseCase,
    private studentRepository: IStudentRepository,
    private invoiceRepository: IInvoiceRepository,
    private sppTariffRepository: ISppTariffRepository
  ) {}

  async payOffline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { studentNumber, month, year } = req.body;

      // Multi-unit isolation check
      const student = await this.studentRepository.findByStudentNumber(studentNumber);
      if (!student) {
        res.status(404).json({
          success: false,
          message: "Siswa tidak ditemukan",
        });
        return;
      }

      if (user.role === "UNIT_ADMIN") {
        if (student.schoolUnitId !== user.schoolUnitId) {
          res.status(403).json({
            success: false,
            message: "Akses ditolak: Anda tidak memiliki otoritas untuk mengelola unit sekolah ini",
          });
          return;
        }
      }

      const result = await this.processOfflinePaymentUseCase.execute({
        studentId: student.id,
        month: Number(month),
        year: Number(year),
        recordedById: user.id,
      });

      res.status(200).json({
        success: true,
        message: "Pembayaran tunai SPP offline berhasil diproses",
        data: result,
      });
    } catch (error: any) {
      if (
        error.message.startsWith("Gagal:") ||
        error.message === "Siswa tidak ditemukan"
      ) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  async getStudentInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentNumber = req.params.studentNumber as string;
      const year = req.query["year"] ? Number(req.query["year"]) : new Date().getFullYear();

      if (!studentNumber) {
        res.status(400).json({
          success: false,
          message: "NIS siswa harus disertakan",
        });
        return;
      }

      const student = await this.studentRepository.findByStudentNumber(studentNumber);
      if (!student) {
        res.status(404).json({
          success: false,
          message: "Siswa tidak ditemukan",
        });
        return;
      }

      const tariff = await this.sppTariffRepository.findByUnitAndYear(
        student.schoolUnitId,
        student.enrollmentYear
      );

      if (!tariff) {
        res.status(400).json({
          success: false,
          message: "Master tarif SPP untuk angkatan siswa ini belum dikonfigurasi",
        });
        return;
      }

      const baseAmount = tariff.amount;
      const discountApplied = Math.floor((baseAmount * student.discountPercentage) / 100);
      const netAmount = baseAmount - discountApplied;

      // Fetch existing invoices from DB
      const dbInvoices = await this.invoiceRepository.findManyByStudentAndYear(student.id, year);

      // Construct 12 months (1 to 12)
      const invoices = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const existing = dbInvoices.find((inv) => inv.month === month && inv.invoiceType === "SPP");
        if (existing) {
          return existing;
        }
        return {
          id: null,
          studentId: student.id,
          invoiceType: "SPP",
          month,
          year,
          baseAmount,
          discountApplied,
          amount: netAmount,
          status: "PENDING",
          midtransOrderId: null,
        };
      });

      res.status(200).json({
        success: true,
        message: "Daftar invoice SPP siswa berhasil diambil",
        data: invoices,
      });
    } catch (error) {
      next(error);
    }
  }

  async payOnlineSimulated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentNumber, month, year } = req.body;

      const student = await this.studentRepository.findByStudentNumber(studentNumber);
      if (!student) {
        res.status(404).json({
          success: false,
          message: "Siswa tidak ditemukan",
        });
        return;
      }

      // 1. Validasi Eksistensi Invoice
      const existingInvoice = await this.invoiceRepository.findByUniqueComposite(
        student.id,
        Number(month),
        Number(year),
        InvoiceType.SPP
      );

      if (existingInvoice && existingInvoice.status === InvoiceStatus.PAID) {
        res.status(400).json({
          success: false,
          message: "Gagal: Tagihan SPP siswa untuk bulan dan tahun tersebut sudah lunas",
        });
        return;
      }

      let invoiceData;
      let amountToPay;

      if (!existingInvoice) {
        const tariff = await this.sppTariffRepository.findByUnitAndYear(
          student.schoolUnitId,
          student.enrollmentYear
        );

        if (!tariff) {
          res.status(400).json({
            success: false,
            message: "Gagal: Master tarif SPP untuk angkatan siswa ini belum dikonfigurasi",
          });
          return;
        }

        const baseAmount = tariff.amount;
        const discountApplied = Math.floor((baseAmount * student.discountPercentage) / 100);
        amountToPay = baseAmount - discountApplied;

        invoiceData = {
          studentId: student.id,
          invoiceType: InvoiceType.SPP,
          month: Number(month),
          year: Number(year),
          baseAmount,
          discountApplied,
          amount: amountToPay,
          status: InvoiceStatus.PAID,
          midtransOrderId: `MOCK-MIDTRANS-${Date.now()}`,
        };
      } else {
        amountToPay = existingInvoice.amount;
        invoiceData = {
          ...existingInvoice,
          status: InvoiceStatus.PAID,
          midtransOrderId: existingInvoice.midtransOrderId || `MOCK-MIDTRANS-${Date.now()}`,
        };
      }

      const transactionData = {
        type: "INCOME" as any,
        categoryId: 1, // SPP
        paymentMethod: "MIDTRANS" as any,
        amount: amountToPay,
        description: `Pembayaran SPP online (simulasi Midtrans) bulan ${month} tahun ${year} untuk siswa ${student.name}`,
        schoolUnitId: student.schoolUnitId,
        recordedById: null, // Online system
      };

      const result = await this.invoiceRepository.createOfflinePayment(
        invoiceData,
        transactionData,
        existingInvoice?.id
      );

      res.status(200).json({
        success: true,
        message: "Simulasi pembayaran online SPP (Midtrans) berhasil diproses",
        data: {
          invoiceId: result.invoice.id,
          studentId: result.invoice.studentId,
          month: result.invoice.month,
          year: result.invoice.year,
          amountPaid: result.transaction.amount,
          transactionId: result.transaction.id,
          midtransOrderId: result.invoice.midtransOrderId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
