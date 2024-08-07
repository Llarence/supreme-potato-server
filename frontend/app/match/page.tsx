'use client'

import { useState } from 'react'

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
  )

import CreatableSelect from 'react-select/creatable'

import NormalDistribution from 'normal-distribution'

// All these functions are necesary for numerical accuracy
import { calcDisBounds, erfc, getWin } from '../../util/math'

// TODO: Some distributions still will not graph properly
//  (Blue: 7500, Red: 2521, 2910, 111, year: 2019, week: 3, type: foul)
// TODO: Make sure the win bounds and sample points give good numbers

const graphPoints = 250

// Sets the y value of the bound points relative to the max high of the distribution
const graphBoundsYFactor = 0.025

interface SelectOption {
    readonly label: string
    readonly value: string
}

export default function Page() {
    const [blueSelectInputValue, setBlueSelectInputValue] = useState('')
    const [blueSelectValue, setBlueSelectValue] = useState<readonly SelectOption[]>([])

    const [redSelectInputValue, setRedSelectInputValue] = useState('')
    const [redSelectValue, setRedSelectValue] = useState<readonly SelectOption[]>([])

    const [response, setResponse] = useState<any>(undefined)

    const [year, setYear] = useState('')
    const [elim, setElim] = useState(false)
    const [week, setWeek] = useState('')

    const [dataType, setDataType] = useState('total')
    const [buttonDisabled, setButtonDisabled] = useState(false)

    const [blueDistribution, setBlueDistribution] = useState<NormalDistribution>(new NormalDistribution())
    const [redDistribution, setRedDistribution] = useState<NormalDistribution>(new NormalDistribution())

    const [xs, setXs] = useState<string[]>([])
    const [blueYs, setBlueYs] = useState<Number[]>([])
    const [redYs, setRedYs] = useState<Number[]>([])

    const [winRate, setWinRate] = useState(NaN)

    function handleKey(key: string,
                       inputValue: string,
                       selectValue: readonly SelectOption[],
                       setInputValue: React.Dispatch<React.SetStateAction<string>>,
                       setSelectValue: React.Dispatch<React.SetStateAction<readonly SelectOption[]>>): Boolean {
        if (!inputValue || !/^[1-9]\d*$/.test(inputValue)) {
            return false
        }

        for (let i = 0; i < selectValue.length; i++) {
            if (selectValue[i].label == inputValue) {
                return false
            }
        }

        if (key == 'Enter' || key == 'Tab') {
            setSelectValue([...selectValue, { label: inputValue, value: inputValue }])
            setInputValue('')
            return true
        }

        return false
    }

    function updateDistributions(blueDistribution: NormalDistribution, redDistribution: NormalDistribution) {
        const blueBounds = calcDisBounds(blueDistribution, graphBoundsYFactor)
        const redBounds = calcDisBounds(redDistribution, graphBoundsYFactor)

        const minX = Math.min(blueBounds.low, redBounds.low)
        const maxX = Math.max(blueBounds.high, redBounds.high)

        const deltaX = (maxX - minX) / (graphPoints - 1)

        const blueScale = 2.0 / erfc(0, blueDistribution.mean, blueDistribution.standardDeviation)
        const redScale = 2.0 / erfc(0, redDistribution.mean, redDistribution.standardDeviation)

        let xs: string[] = []
        let blueYs: Number[] = []
        let redYs: Number[] = []
        for (let i = 0; i < graphPoints; i++) {
            const x = minX + (i * deltaX)

            xs.push(x.toFixed(2))
            if (x >= 0) {
                blueYs.push(blueDistribution.pdf(x) * blueScale)
                redYs.push(redDistribution.pdf(x) * redScale)
            } else {
                blueYs.push(0)
                redYs.push(0)
            }
        }

        setXs(xs)
        setBlueYs(blueYs)
        setRedYs(redYs)

        setWinRate(getWin(blueDistribution, redDistribution))
        setBlueDistribution(blueDistribution)
        setRedDistribution(redDistribution)
    }

    async function updateChart() {
        setButtonDisabled(true)

        let teamRequest = ''
        blueSelectValue.forEach(element => { teamRequest += '&blues=frc' + element.value })
        redSelectValue.forEach(element => { teamRequest += '&reds=frc' + element.value})

        const rawResponse = await fetch(`/api/match?year=${year}&elim=${elim}&week=${week}${teamRequest}`)
        if (!rawResponse.ok) {
            setButtonDisabled(false)
            return
        }

        const response = await rawResponse.json()

        const blue = response['blue']['total']
        const red = response['red']['total']

        updateDistributions(new NormalDistribution(blue['mean'], blue['stddev']), new NormalDistribution(red['mean'], red['stddev']))

        setDataType('total')
        setResponse(response)
        setButtonDisabled(false)
    }

    return (
        <>
            <CreatableSelect
                components={{ DropdownIndicator: null }}
                inputValue={blueSelectInputValue}
                isClearable
                isMulti
                menuIsOpen={false}
                onChange={setBlueSelectValue}
                onInputChange={setBlueSelectInputValue}
                onKeyDown={event => {
                        if (handleKey(event.key, blueSelectInputValue, blueSelectValue,
                                      setBlueSelectInputValue, setBlueSelectValue)) {
                            event.preventDefault()
                        }
                    }
                }
                onMenuClose={() => handleKey('Enter', blueSelectInputValue, blueSelectValue,
                                             setBlueSelectInputValue, setBlueSelectValue)}
                placeholder='Blue Teams...'
                value={blueSelectValue}
            />
            <CreatableSelect
                components={{ DropdownIndicator: null }}
                inputValue={redSelectInputValue}
                isClearable
                isMulti
                menuIsOpen={false}
                onChange={newValue => setRedSelectValue(newValue)}
                onInputChange={newValue => setRedSelectInputValue(newValue)}
                onKeyDown={event => {
                        if (handleKey(event.key, redSelectInputValue, redSelectValue,
                                      setRedSelectInputValue, setRedSelectValue)) {
                            event.preventDefault()
                        }
                    }
                }
                onMenuClose={() => handleKey('Enter', redSelectInputValue, redSelectValue,
                                             setRedSelectInputValue, setRedSelectValue)}
                placeholder='Red Teams...'
                value={redSelectValue}
            />
            <input type='number' id='year' value={year} onChange={event => setYear(event.target.value)}/>
            <label htmlFor='year'>Year</label>
            <br></br>
            <input type='checkbox' id='Elims' checked={elim} onChange={() => setElim(!elim)}/>
            <label htmlFor='Elims'>Elims</label>
            <br></br>
            <input type='number' id='week' value={week} onChange={event => setWeek(event?.target.value)}/>
            <label htmlFor='week'>Week</label>
            <br></br>
            <p>{`Chance blue has a higher ${dataType}: ${(winRate * 100).toFixed(2)}%`}</p>
            <button onClick={updateChart} disabled={buttonDisabled}>Go</button>
            <select disabled={response == undefined} value={dataType} onChange={event => {
                        const value = event.target.value
                        const blue = response['blue'][value]
                        const red = response['red'][value]

                        updateDistributions(new NormalDistribution(blue['mean'], blue['stddev']), new NormalDistribution(red['mean'], red['stddev']))

                        setDataType(value)
                    }
                }>
                <option value='total'>Total</option>
                <option value='auto'>Auto</option>
                <option value='teleop'>Teleop</option>
                <option value='foul'>Foul</option>
            </select>
            <Line
                options={{
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label
                                    const x = Number(context.label)

                                    let val = 1
                                    if (x >= 0) {
                                        if (label == 'Blue') {
                                            val = erfc(x, blueDistribution.mean, blueDistribution.standardDeviation) / 
                                                erfc(0, blueDistribution.mean, blueDistribution.standardDeviation)
                                        } else if (label == 'Red') {
                                            val = erfc(x, redDistribution.mean, redDistribution.standardDeviation) / 
                                                erfc(0, redDistribution.mean, redDistribution.standardDeviation)
                                        }
                                    }

                                    return `${label}: ${(val * 100).toFixed(2)}%`
                                }
                            }
                        }
                    },
                    elements: {
                        point:{
                            radius: 0
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'nearest',
                    }
                }}
                data={{
                    labels: xs,
                    datasets: [{
                        fill: true,
                        label: 'Blue',
                        data: blueYs,
                        borderColor: 'rgb(53, 56, 235)',
                        backgroundColor: 'rgba(53, 56, 235, 0.5)'
                    },
                    {
                        fill: true,
                        label: 'Red',
                        data: redYs,
                        borderColor: 'rgb(235, 69, 54)',
                        backgroundColor: 'rgba(235, 69, 54, 0.5)'
                    }]
                }}
            />
        </>
    )
}
