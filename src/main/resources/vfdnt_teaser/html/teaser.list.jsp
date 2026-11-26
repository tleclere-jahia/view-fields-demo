<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<div class="teaser teaser--list">
    <h3>${fn:escapeXml(currentNode.displayableName)} <small>${fn:escapeXml(currentNode.properties.badge.string)}</small></h3>
    <ul>
        <li>${fn:escapeXml(currentNode.properties.teaserText.string)}</li>
        <li>maxItems: ${fn:escapeXml(currentNode.properties.maxItems.string)}</li>
    </ul>
</div>
