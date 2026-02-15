<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Core\Styles;


use DOMDocument;
use DOMElement;
use DOMNode;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\Styles\StyleCompiler;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\Styles\StyleElement;

class StyleSetter
{
    /** @var StyleCompiler */
    public $StyleCompiler;

    /** @var StyleElement[] */
    public $StyleElements;

    /**
     * @param $styles
     * @param $domDocument DOMDocument
     */
    public function Apply($styles,$domDocument)
    {
        if($styles==null)
            return;

        $this->StyleCompiler=new StyleCompiler();

        $this->StyleElements=$this->CompileStyles($styles);

        $this->ProcessNode($domDocument);

    }

    /**
     * @param DOMNode
     */
    private function ProcessNode($node)
    {
        if($node->nodeType==XML_ELEMENT_NODE)
            foreach($this->StyleElements as $styleElement)
            {
                if($styleElement->Match($node))
                {
                    $styleElement->AddStyles($node);
                }
            }

        foreach($node->childNodes as $node)
        {
            if($node->nodeType==XML_ELEMENT_NODE )
                $this->ProcessNode($node);
        }
    }

    /**
     * @param $styles
     * @return StyleElement[]
     */
    private function CompileStyles($styles)
    {
        $styleElements=array();
        foreach($styles as $selector=>$value)
        {
            $selectorElements=\explode(',',$selector);
            $styleElements[]=new StyleElement($selector,$value);
        }

        return $styleElements;

    }
}

