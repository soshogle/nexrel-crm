<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Core;


use Exception;
use rednaowooextraproduct\core\Managers\SlateGenerator\Block\Condition;
use rednaowooextraproduct\core\Managers\SlateGenerator\Block\Field;
use rednaowooextraproduct\core\Managers\SlateGenerator\Block\Image;
use rednaowooextraproduct\core\Managers\SlateGenerator\Block\Paragraph;

use rednaowooextraproduct\core\Managers\SlateGenerator\Block\Table\Table;
use rednaowooextraproduct\core\Managers\SlateGenerator\Block\Table\TableCell;
use rednaowooextraproduct\core\Managers\SlateGenerator\Block\Table\TableRow;
use rednaowooextraproduct\core\Managers\SlateGenerator\Block\Template;
use rednaowooextraproduct\core\Managers\SlateGenerator\Text\Span;
use rednaowooextraproduct\core\Managers\SlateGenerator\Text\Text;

class SlateNodeFactory
{
    public static function GetNode($slateObject)
    {
        if($slateObject->object=='block')
        {
            switch ($slateObject->type)
            {
                case 'paragraph':
                    return new Paragraph();
                case 'condition':
                    return new Condition();
                case 'template':
                    return new Template();
                case 'table':
                    return new Table();
                case 'table-row':
                    return new TableRow();
                case 'table-cell':
                    return new TableCell();
                case 'image':
                    return new Image();
            }

            throw new Exception('Invalid block type '.$slateObject->type);
        }

        if($slateObject->object=='text')
        {
            return new Text();
        }

        if($slateObject->object=='inline')
        {
            switch ($slateObject->type)
            {
                case 'field':
                    return new Field();
            }

            throw new Exception('Invalid inline type '.$slateObject->type);
        }


        if($slateObject->object=='leaf')
        {
            return new Span();
        }

        throw new Exception('Invalid object type '.$slateObject->object);

    }
}