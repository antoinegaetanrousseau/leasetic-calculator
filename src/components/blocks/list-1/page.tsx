import { OrderMetricsList } from "./components/order-metrics-list"

export function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 sm:p-8">
      <OrderMetricsList />
    </div>
  )
}