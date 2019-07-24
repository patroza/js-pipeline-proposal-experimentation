import { left, right, mapLeft, map, } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/pipeable'
import { isTSAnyKeyword } from '@babel/types';

describe('imperative', () => {
  const usecase = (input) => {
    const validatedInput = input
      |> validate
      |> map(x => ({ ...x, validated: true }))(#)
    if (validatedInput._tag === "Left") { return left('mapped: ' + validatedInput.left) }

    return right(Boolean(validatedInput.right.validated))
  }

  it('works for positive case', () => {
    const input = {
      a: 1,
      b: 2,
      c: "hello"
    }

    const result = usecase(input)

    expect(result._tag).toBe('Right')
    expect(result.right).toEqual(true)
  })


  it('works for negative case', () => {
    const input = {
      b: 2,
      c: "hello"
    }

    const result = usecase(input)

    expect(result._tag).toBe('Left')
    expect(result.left).toEqual('mapped: fail')
  })
})



const runable = fnc => input => run(fnc(input))
const runableAsync = fnc => input => runAsync(fnc(input))

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
  function* usecaseImpl(input) {
    const validatedInput = yield input
      |> validate
      |> mapLeft(x => 'mapped: ' + x)(#)
      |> map(x => ({ ...x, validated: true }))(#)

    const validatedIsTrue = yield right(validatedInput.validated)
      |> map(x => Boolean(x))(#)
    return validatedIsTrue
  }

  const usecase = runable(usecaseImpl)

  it('works', () => {
    const input = {
      a: 1,
      b: 2,
      c: "hello"
    }

    const result = usecase(input)

    expect(result._tag).toBe('Right')
    expect(result.right).toEqual(true)
  })

  it('works for the negative case', () => {
    const input = {
      b: 2,
      c: "hello"
    }

    const result = usecase(input)

    expect(result._tag).toBe('Left')
    expect(result.left).toEqual('mapped: fail')
  })

  describe('nested generators ;-) without having to invoke `run` manually', () => {
    function* validateGen(input) {
      if (input.a !== 1) { return yield left('fail') }
      return input
    }
    const validate = runable(validateGen)

    function* usecaseImpl(input) {
      const validatedInput = yield input
        |> validate
        |> mapLeft(x => 'mapped: ' + x)(#)
        |> map(x => ({ ...x, validated: true }))(#)

        const validatedIsTrue = yield right(validatedInput.validated)
        |> map(x => Boolean(x))(#)
      return validatedIsTrue
    }
    const usecase = runable(usecaseImpl)

    it('works', () => {
      const input = {
        a: 1,
        b: 2,
        c: "hello"
      }

      const result = usecase(input)

      expect(result._tag).toBe('Right')
      expect(result.right).toEqual(true)
    })

    it('works for the negative case', () => {
      const input = {
        b: 2,
        c: "hello"
      }

      const result = usecase(input)

      expect(result._tag).toBe('Left')
      expect(result.left).toEqual('mapped: fail')
    })
  })
})

describe('declarative async', () => {
  async function* usecaseImpl(input) {
    const validatedInput = yield input
      |> await validateAsync(#)
      |> mapLeft(x => 'mapped: ' + x)(#)
      |> map(x => ({ ...x, validated: true }))(#)

    const validatedIsTrue = yield right(validatedInput.validated)
      |> map(x => Boolean(x))(#)
    return validatedIsTrue
  }

  const usecase = runableAsync(usecaseImpl)

  it('works', async () => {
    const input = {
      a: 1,
      b: 2,
      c: "hello"
    }

    const result = await usecase(input)

    expect(result._tag).toBe('Right')
    expect(result.right).toEqual(true)
  })

  it('works for the negative case', async () => {
    const input = {
      b: 2,
      c: "hello"
    }

    const result = await usecase(input)

    expect(result._tag).toBe('Left')
    expect(result.left).toEqual('mapped: fail')
  })

  describe('nested generators ;-) without having to invoke `run` manually', () => {
    async function* validateGenAsync(input) {
      if (input.a !== 1) {
        return yield await Promise.resolve(left('fail'))
      }
      return input
    }
    const validateGen = runableAsync(validateGenAsync)

    async function* usecaseImpl(input) {
      const validatedInput = yield input
        |> await validateGen(#)
        |> mapLeft(x => 'mapped: ' + x)(#)
        |> map(x => ({ ...x, validated: true }))(#)
      const validatedIsTrue = yield right(validatedInput.validated)
        |> map(x => Boolean(x))(#)
      return validatedIsTrue
    }
    const usecase = runableAsync(usecaseImpl)

    it('works', async () => {
      const input = {
        a: 1,
        b: 2,
        c: "hello"
      }

      const result = await usecase(input)

      expect(result._tag).toBe('Right')
      expect(result.right).toEqual(true)
    })

    it('works for the negative case', async () => {
      const input = {
        b: 2,
        c: "hello"
      }

      const result = await usecase(input)

      expect(result._tag).toBe('Left')
      expect(result.left).toEqual('mapped: fail')
    })
  })
})

const isGenerator = (outp) => typeof outp.next === 'function' // and hasOwnProperty done?

const validate = (input) => {
  if (input.a !== 1) { return left('fail') }
  return right(input)
}

const validateAsync = async (input) => validate(input)

const run = (gen) => {
  let val = undefined
  let result = { done: false }
  while (!result.done) {
    result = gen.next(val)
    val = result.value
    if (!val || !val._tag) {
      // the function returned a value?
      continue
    }
    // bail on error
    if (val._tag === 'Left') {
      return val
    }
    // unwrap the Right value to pass to the next iteration.
    val = val.right
  }
  return right(val)
}

const runAsync = async (gen) => {
  let val = undefined
  let result = { done: false }
  while (!result.done) {
    result = await gen.next(val)
    val = result.value
    if (!val || !val._tag) {
      // the function returned a value?
      continue
    }
    // bail on error
    if (val._tag === 'Left') {
      return val
    }
    // unwrap the Right value to pass to the next iteration.
    val = val.right
  }
  return right(val)
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