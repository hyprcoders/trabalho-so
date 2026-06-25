import createModule from "../wasm/module.js";
let afs;
let Scheduler;

createModule().then(instance => {
    scheduler = instance
    const vec = new instance.VectorProcess();
    console.log(instance)
    console.log(vec)
    console.log(vec.push_back)
    vec.push_back({
        "id": '1',
        "arrivalTime": 0,
        "deadline": 0,
        "executionTime": 0,
        "priority" : 0
    })
    console.log(vec)
    const a = instance.schedule({
        "quantum": 0,
        "switchingTime": 0,
        "seed": 0,
        "schedulingAlgorithm": instance.SchedulingAlgorithm.FIFO,
        "processes": vec
    })
    console.log(a)
    console.log(a.execution.get(0))
});
