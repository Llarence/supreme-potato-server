'use client'

import { useState, KeyboardEvent } from 'react'

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

const points = 100

interface Normal {
    readonly mean: number
    readonly stddev: number
}

interface SelectOption {
    readonly label: string
    readonly value: string
}

export default function Page() {
    const [blueSelectInputValue, setBlueSelectInputValue] = useState('')
    const [blueSelectValue, setBlueSelectValue] = useState<readonly SelectOption[]>([])

    const [redSelectInputValue, setRedSelectInputValue] = useState('')
    const [redSelectValue, setRedSelectValue] = useState<readonly SelectOption[]>([])

    const [year, setYear] = useState('')
    const [elim, setElim] = useState(false)
    const [week, setWeek] = useState('')

    const [buttonDisabled, setButtonDisabled] = useState(false)

    const [blueDistribution, setBlueDistribution] = useState<NormalDistribution>(new NormalDistribution())
    const [redDistribution, setRedDistribution] = useState<NormalDistribution>(new NormalDistribution())

    const [xs, setXs] = useState<string[]>([])
    const [blueYs, setBlueYs] = useState<Number[]>([])
    const [redYs, setRedYs] = useState<Number[]>([])

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
            setSelectValue([...selectValue, { label: inputValue, value: inputValue }]);
            setInputValue('')
            return true
        }

        return false;
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

        const blueDistribution = new NormalDistribution(blue['mean'], blue['stddev'])
        const redDistribution = new NormalDistribution(red['mean'], red['stddev'])

        const minX = Math.min(blueDistribution.mean - (3 * blueDistribution.standardDeviation),
                              redDistribution.mean - (3 * redDistribution.standardDeviation))
        const maxX = Math.max(blueDistribution.mean + (3 * blueDistribution.standardDeviation),
                              redDistribution.mean + (3 * redDistribution.standardDeviation))

        let xs: string[] = []
        let blueYs: Number[] = []
        let redYs: Number[] = []
        console.log(blueDistribution, redDistribution)
        for (let i = 0; i < points; i++) {
            const x = minX + ((i / (points - 1)) * (maxX - minX))
            xs.push(x.toFixed(2))
            blueYs.push(blueDistribution.pdf(x))
            redYs.push(redDistribution.pdf(x))
        }

        setXs(xs)
        setBlueYs(blueYs)
        setRedYs(redYs)

        setBlueDistribution(blueDistribution)
        setRedDistribution(redDistribution)

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
                onKeyDown={(event) => {
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
                onChange={(newValue) => setRedSelectValue(newValue)}
                onInputChange={(newValue) => setRedSelectInputValue(newValue)}
                onKeyDown={(event) => {
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
            <input type='number' value={year} onChange={(event) => setYear(event.target.value)} />
            <input type='checkbox' checked={elim} onChange={() => setElim(!elim)} />
            <input type='number' value={week} onChange={(event) => setWeek(event?.target.value)} />
            <button onClick={updateChart} disabled={buttonDisabled}>Go</button>
            <Line
                options={{
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label;
                                    const x = Number(context.label);
                                    
                                    let val = 1
                                    if (label == 'Blue') {
                                        val -= blueDistribution.cdf(x)
                                    } else if (label == 'Red') {
                                        val -= redDistribution.cdf(x)
                                    }
                                    
                                    return `${label}: ${(val * 100).toFixed(2)}%`;
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
