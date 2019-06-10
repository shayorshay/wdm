local amount = redis.call("HGET", KEYS[1], ARGV[1])
local toSubtract = ARGV[2];

if (amount > toSubtract) then
    return redis.call("HINCRBY", KEYS[1], ARGV[1], -toSubtract)
else
    return nil
end