<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<div class="control control--default">
    <h3>${fn:escapeXml(currentNode.displayableName)}</h3>
    <p>maxItems: ${fn:escapeXml(currentNode.properties.maxItems.string)}</p>
</div>
