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

describe('declarative', () => {
  function* usecase(input) {
    const validatedInput = yield input |> validate

    return true
  }

  // non async version, todo: async ;-)
  const run = (gen) => {
    let result = gen.next()
    console.log(result)
    // bail on error
    if (result.value._tag === 'Left') {
      return result.value
    }

    while (!result.done) {
      result = gen.next(result.value)
      console.log(result)
      // bail on error
      if (result.value._tag === 'Left') {
        return result.value
      }
    }
    return E.right(result.value)
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

  
const validate = (input) => {
  if (input.a !== 1) { return E.left('fail') }
  return E.right(input)
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