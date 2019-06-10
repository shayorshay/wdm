local amount = redis.call("HGET", KEYS[1], ARGV[1])     

if (amount > 0) then
    return redis.call("HINCRBY", KEYS[1], ARGV[1], -1)
else
    return nil
end