local itemStock = redis.call("HGET", KEYS[1], stock)
local toSubtract = ARGV[1];

if (itemStock > toSubtract) 
    return redis.call("HINCRBY", KEYS[1], stock, -toSubtract)
else
    return nil
end        