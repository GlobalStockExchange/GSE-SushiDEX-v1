import { Container } from '@sushiswap/ui'
import { BarBalanceCard } from 'src/ui/bar/BarBalanceCard'
import { BarBalanceProvider } from 'src/ui/bar/BarBalanceProvider'
import { BarChartCard } from 'src/ui/bar/BarChartCard'
import { ManageBarCard } from 'src/ui/bar/ManageBarCard'
import { VotingPowerCard } from 'src/ui/bar/VotingPowerCard'
import { VotingPowerProvider } from 'src/ui/bar/VotingPowerProvider'

export default async function Page() {
  return (
    <Container maxWidth="5xl" className="px-2 sm:px-4">
      <VotingPowerProvider>
        <VotingPowerCard />
      </VotingPowerProvider>
      <div className="grid grid-cols-1 md:grid-cols-[auto_400px] gap-6 pt-6">
        <div>
          <ManageBarCard />
        </div>
        <div className="flex flex-col gap-6">
          <BarBalanceProvider>
            <BarBalanceCard />
          </BarBalanceProvider>
          <BarChartCard />
        </div>
      </div>
      {/* <div className="py-4">
    <Separator />
  </div> */}
    </Container>
  )
}
