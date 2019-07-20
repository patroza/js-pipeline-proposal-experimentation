import * as E from 'fp-ts/lib/Either'
import * as TE from 'fp-ts/lib/TaskEither'
import { isTSAnyKeyword } from '@babel/types';

describe('imperative', () => {
  const usecase = (input) => {
    const validatedInput = input |> validate
    if (validatedInput._tag === "left") { return validatedInput }
  
    return validatedInput
  }

  it('works for positive case', () => {
    const input = {
      a: 1,
      b: 2,
      c: "hello"
    }
    const result = usecase(input)

    expect(result._tag).toBe('Right')
    expect(result.right).toEqual(input)
  })

    
  it('works for negative case', () => {
    const input = {
      b: 2,
      c: "hello"
    }
    const result = usecase(input)

    expect(result._tag).toBe('Left')
    expect(result.left).toEqual('fail')
  })
})

/*
  The issues with this approach:
  - we're using pipeline operator, hard to use in Typescript until proposal has stabilized
    however may be somehow possible to use babel-typescript etc...
  - we're using generators which are difficult with typings
    however there may be improvements in TS3.6
  - So far we're not mixing async calls into the generators yet, so we expect to always have them wrapped as TaskEither.
  // some info about that at ; https://dev.to/nestedsoftware/asynchronous-generators-and-pipelines-in-javascript--1h62
*/
describe('declarative', () => {
  function* usecase(input) {
    const validatedInput = yield input |> validate

    return true
  }

  it('works', () => {
    const input = {
      a: 1,
      b: 2,
      c: "hello"
    }
  
    const result = run(usecase(input))
    expect(result._tag).toBe('Right')
    expect(result.right).toEqual(true)
  })

  it('works for the negative case', () => {
    const input = {
      b: 2,
      c: "hello"
    }
    const result = run(usecase(input))
    expect(result._tag).toBe('Left')
    expect(result.left).toEqual('fail')
  })

  describe('works with nested generators ;-) without manual run', () => {
    function* validateGen(input) {
      if (input.a !== 1) { return yield E.left('fail') }
      return input
    }
    function* usecase(input) {
      const validatedInput = yield input |> validateGen
  
      return true
    }

    it('works', () => {
      const input = {
        a: 1,
        b: 2,
        c: "hello"
      }
    
      const result = run(usecase(input))
      expect(result._tag).toBe('Right')
      expect(result.right).toEqual(true)
    })

    it('works for the negative case', () => {
      const input = {
        b: 2,
        c: "hello"
      }
      const result = run(usecase(input))
      expect(result._tag).toBe('Left')
      expect(result.left).toEqual('fail')
    })
  })
})

describe('declarative async', () => {
  function* usecase(input) {
    const validatedInput = yield input |> validateAsync

    return true
  }

  it('works', async () => {
    const input = {
      a: 1,
      b: 2,
      c: "hello"
    }
  
    const result = await runAsync(usecase(input))
    expect(result._tag).toBe('Right')
    expect(result.right).toEqual(true)
  })

  it('works for the negative case', async () => {
    const input = {
      b: 2,
      c: "hello"
    }
    const result = await runAsync(usecase(input))
    expect(result._tag).toBe('Left')
    expect(result.left).toEqual('fail')
  })

  describe('works with nested generators ;-) without manual run', () => {
    function* validateGenAsync(input) {
      if (input.a !== 1) { return yield TE.left('fail') }
      return input
    }
    function* usecase(input) {
      const validatedInput = yield input |> validateGenAsync
  
      return true
    }

    it('works', async () => {
      const input = {
        a: 1,
        b: 2,
        c: "hello"
      }
    
      const result = await runAsync(usecase(input))
      expect(result._tag).toBe('Right')
      expect(result.right).toEqual(true)
    })

    it('works for the negative case', async () => {
      const input = {
        b: 2,
        c: "hello"
      }
      const result = await runAsync(usecase(input))
      expect(result._tag).toBe('Left')
      expect(result.left).toEqual('fail')
    })
  })
})
  
const isGenerator = (outp) => typeof outp.next === 'function' // and hasOwnProperty done?

const validate = (input) => {
  if (input.a !== 1) { return E.left('fail') }
  return E.right(input)
}

const validateAsync = (input) => {
  if (input.a !== 1) { return TE.left('fail') }
  return TE.right(input)
}

const run = (gen) => {
  let val = undefined
  let result = { done: false }
  while (!result.done) {
    result = gen.next(val)
    val = result.value
    if (isGenerator(val)) {
      val = run(val)
    }
    // bail on error
    if (val._tag === 'Left') {
      return val
    }
  }
  return E.right(val)
}


const runAsync = async (gen) => {
  let val = undefined
  let result = { done: false }
  while (!result.done) {
    result = gen.next(val)
    val = typeof result.value === 'function' ? await result.value() : result.value
    if (isGenerator(val)) {
      val = await runAsync(val)
    }
    // bail on error
    if (val._tag === 'Left') {
      return val
    }
  }
  return E.right(val)
}


/*
  compose(
    TE.chain(i =>
      pipe(
        TE.fromEither(validateCreateTrainTripInfo(i)),
        TE.mapLeft(liftType<CreateError>()),
      ),
    ),
    chainTupTask(i =>
      pipe(
        getTrip(i.templateId),
        TE.mapLeft(liftType<CreateError>()),
      ),
    ),
    TE.chain(([trip, proposal]) =>
      TE.fromEither(
        pipe(
          E.right<CreateError, TrainTrip>(TrainTrip.create(proposal, trip)),
          E.map(tee(db.trainTrips.add)),
          E.map(trainTrip => trainTrip.id),
        ),
      ),
    ),
  ),
*/