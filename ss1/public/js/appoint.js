const appoints = document.getElementsByClassName('appoint')
const pastBtn = document.getElementById('past')
const currentBtn = document.getElementById('current')
const futureBtn = document.getElementById('future')
const allBtn = document.getElementById('all')

function recover() {
    for (const appoint of appoints)
        appoint.style.display = ''
}

function adjust(mark) {
    recover()
    for (const appoint of appoints)
        if (Number(appoint.id) !== mark)
            appoint.style.display ='none'
}

if (pastBtn)
    pastBtn.addEventListener('click', () => adjust(0))

if (currentBtn)
    currentBtn.addEventListener('click', () => adjust(1))

if (futureBtn)
    futureBtn.addEventListener('click', () => adjust(2))

if (allBtn)
    allBtn.addEventListener('click', () => recover())