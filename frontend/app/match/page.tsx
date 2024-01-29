'use client'

import { useState, KeyboardEvent } from 'react'

import CreatableSelect from 'react-select/creatable'

interface SelectOption {
    readonly label: string;
    readonly value: string;
}

function createOption(label: string): SelectOption {
    return { label, value: label }
}

export default function Page() {
    const [redSelectInputValue, setRedSelectInputValue] = useState('');
    const [redSelectValue, setRedSelectValue] = useState<readonly SelectOption[]>([]);

    const [blueSelectInputValue, setBlueSelectInputValue] = useState('');
    const [blueSelectValue, setBlueSelectValue] = useState<readonly SelectOption[]>([]);

    const [year, setYear] = useState('');
    const [elim, setElim] = useState(false);
    const [week, setWeek] = useState('');

    const [buttonDisabled, setButtonDisabled] = useState(false);
    const [output, outputSet] = useState('');

    function handleKey(event: KeyboardEvent<Element>,
                       inputValue: string,
                       setInputValue: React.Dispatch<React.SetStateAction<string>>,
                       setValue: React.Dispatch<React.SetStateAction<readonly SelectOption[]>>) {
        if (!inputValue || !/^[1-9]\d*$/.test(inputValue)) {
            return 
        }

        let key = event.key
        if (key == 'Enter' || key == 'Tab') {
            setValue((prev) => [...prev, createOption(inputValue)]);
            setInputValue('')
            event.preventDefault()
        }
    }

    async function updateChart() {
        setButtonDisabled(true)

        let teamRequest = ''
        blueSelectValue.forEach(element => { teamRequest += '&blues=frc' + element.value })
        redSelectValue.forEach(element => { teamRequest += '&reds=frc' + element.value})

        let response = await fetch('/api/match?year=' + year +
                                   '&elim=' + elim +
                                   '&week=' + week +
                                   teamRequest)
        outputSet(await response.text());

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
                onKeyDown={(event) => handleKey(event, blueSelectInputValue, setBlueSelectInputValue, setBlueSelectValue)}
                placeholder='Blue Teams...'
                value={blueSelectValue}
            />
            <CreatableSelect
                components={ { DropdownIndicator: null } }
                inputValue={redSelectInputValue}
                isClearable
                isMulti
                menuIsOpen={false}
                onChange={(newValue) => setRedSelectValue(newValue)}
                onInputChange={(newValue) => setRedSelectInputValue(newValue)}
                onKeyDown={(event) => handleKey(event, redSelectInputValue, setRedSelectInputValue, setRedSelectValue)}
                placeholder='Red Teams...'
                value={redSelectValue}
            />
            <input type='number' value={year} onChange={(event) => setYear(event.target.value)} />
            <input type='checkbox' checked={elim} onChange={() => setElim(!elim)} />
            <input type='number' value={week} onChange={(event) => setWeek(event?.target.value)} />
            <button onClick={updateChart} disabled={buttonDisabled}>Go</button>
            <p>{output}</p>
        </>
    )
}
