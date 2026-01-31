/**
 * 平台适配器统一导出
 */

export {
  deliveryOrderToTaskModel,
  repairOrderToTaskModel,
  rentalOrderToTaskModel,
  inferTaskSource,
} from "./task.adapter"
export type { TaskSource, DeliveryOrderRow, RepairOrderRow, RentalOrderRow } from "./task.adapter"

export { workerToWorkerModel } from "./worker.adapter"
export type { WorkerRow } from "./worker.adapter"
