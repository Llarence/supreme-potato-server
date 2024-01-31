'use client'

import { useState } from 'react'

export default function Page() {
    const [year, setYear] = useState('')
    const [stddevs, setStddevs] = useState(false)
    const [defense, setDefense] = useState(false)
    const [dataType, setDataType] = useState('total')
    const [team, setTeam] = useState('')
    const [similars, setSimilars] = useState('')

    const [output, setOutput] = useState('')

    const [buttonDisabled, setButtonDisabled] = useState(false)

    async function updateTeams() {
        setButtonDisabled(true)
        const rawResponse = await fetch(`/api/team?year=${year}&stddevs=${stddevs}&defense=${defense}&type=${dataType}&team=frc${team}&similars=${similars}`)
        if (!rawResponse.ok) {
            setButtonDisabled(false)
            return
        }
        
        const response = await rawResponse.json()

        let output = ''
        response.forEach((element: any) => {
            // Remove the heading frc with a slice
            output += `${element['team'].slice(3)}: ${element['distance'].toPrecision(4)}; `
        })

        output = output.slice(0, -2)

        setOutput(output)
        setButtonDisabled(false)
    }

    return (
        <>
            <input type='number' value={year} onChange={event => setYear(event.target.value)} />
            <input type='checkbox' checked={stddevs} onChange={() => setStddevs(!stddevs)} />
            <input type='checkbox' checked={defense} onChange={() => setDefense(!defense)} />
            <select value={dataType} onChange={event => setDataType(event.target.value)}>
                <option value='total'>Total</option>
                <option value='auto'>Auto</option>
                <option value='teleop'>Teleop</option>
                <option value='foul'>Foul</option>
            </select>
            <input type='number' value={team} onChange={event => setTeam(event.target.value)} />
            <input type='number' value={similars} onChange={event => setSimilars(event.target.value)} />
            <button onClick={updateTeams} disabled={buttonDisabled}>Go</button>
            <br></br>
            <a>{output}</a>
        </>
    )
}
