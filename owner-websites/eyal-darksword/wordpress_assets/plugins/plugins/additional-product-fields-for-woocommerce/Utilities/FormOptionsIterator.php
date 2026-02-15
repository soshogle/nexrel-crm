<?php

namespace rednaowooextraproduct\Utilities;

class FormOptionsIterator
{
    public static function FindFields($fieldsToSearch,$form=null)
    {
        if(!is_array($fieldsToSearch))
        {
            $fieldsToSearch=[$fieldsToSearch];
        }

        return self::InternalFindFields($fieldsToSearch,$form);
    }

    private static function InternalFindFields($fieldsToSearch,$form,$fields=[])
    {
        return null;

    }

}