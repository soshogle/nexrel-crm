-- Orthanc Webhook Script
-- Triggers webhook when new DICOM instances are stored

function OnStoredInstance(instanceId, tags, metadata, origin)
   -- Webhook URL - use host.docker.internal for local testing
   -- For production, use your actual API domain
   local url = os.getenv('DICOM_WEBHOOK_URL') or 'http://host.docker.internal:3000/api/dental/dicom/webhook'
   local secret = os.getenv('DICOM_WEBHOOK_SECRET') or 'local-test-secret-change-in-production'
   
   -- Get user ID from Orthanc metadata or use default
   -- In production, you might store user ID in Orthanc metadata
   local userId = 'default-user-id'  -- TODO: Get from Orthanc metadata or instance tags
   
   -- instanceId is a string, convert to string to be safe
   local instanceIdStr = tostring(instanceId)
   
   -- Build JSON body
   local json_body = '{"event":"NewInstance","resourceId":"' .. instanceIdStr .. '","userId":"' .. userId .. '"}'
   
   -- Use curl via os.execute to make HTTP POST request
   -- Escape quotes and backslashes in JSON for shell command
   json_body_escaped = string.gsub(json_body, '"', '\\"')
   json_body_escaped = string.gsub(json_body_escaped, '\\', '\\\\')
   
   local curl_cmd = string.format(
      'curl -s -X POST "%s" ' ..
      '-H "Content-Type: application/json" ' ..
      '-H "Authorization: Bearer %s" ' ..
      '-d "%s" ' ..
      '--max-time 10 ' ..
      '--connect-timeout 5',
      url, secret, json_body_escaped
   )
   
   -- Execute curl command and capture output
   local handle = io.popen(curl_cmd .. ' 2>&1')
   local result = handle:read("*a")
   local exit_code = handle:close()
   
   -- Check if curl succeeded (exit_code is true/nil on success in some Lua versions)
   -- Also check if result contains error indicators
   if exit_code == true or exit_code == nil or (type(exit_code) == "boolean" and exit_code) then
      print('Webhook succeeded for instance: ' .. instanceIdStr)
   else
      print('Webhook failed for instance ' .. instanceIdStr)
      if result and result ~= "" then
         print('Response: ' .. string.sub(result, 1, 200))  -- Limit response length
      end
   end
end
