import type { IStudentRepository } from "../../domain/repositories/IStudentRepository.js";
import { NotFoundError, ForbiddenError } from "../../domain/errors/AppError.js";

export class DeleteStudentUseCase {
  constructor(private studentRepository: IStudentRepository) {}

  async execute(
    id: number,
    user: { role: string; schoolUnitId: number | null }
  ): Promise<void> {
    const student = await this.studentRepository.findById(id);

    if (!student) {
      throw new NotFoundError("Data siswa tidak ditemukan");
    }

    if (user.role === "UNIT_ADMIN" && student.schoolUnitId !== user.schoolUnitId) {
      throw new ForbiddenError("Akses ditolak: Anda tidak memiliki otoritas untuk mengelola unit sekolah ini");
    }

    await this.studentRepository.delete(id);
  }
}
